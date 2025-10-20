# Streaming endpoint for chatbot - add this to your existing chatbot_user.py

@router.post("/ask/stream")
async def ask_legal_question_stream(
    request: ChatRequest,
    chat_service: ChatHistoryService = Depends(get_chat_history_service),
    current_user: Optional[dict] = Depends(get_optional_current_user)
):
    """
    Streaming version of the chatbot - responses appear word-by-word like ChatGPT
    """
    
    async def generate_stream() -> AsyncGenerator[str, None]:
        try:
            perf_start = time.time()
            
            # Extract user_id
            authenticated_user_id = None
            if current_user and "user" in current_user:
                authenticated_user_id = current_user["user"]["id"]
            effective_user_id = authenticated_user_id or request.user_id
            
            # Basic validation
            if not request.question or not request.question.strip():
                yield f"data: {json.dumps({'error': 'Question cannot be empty'})}\n\n"
                return
            
            # Check for toxic content
            is_toxic, toxic_reason = detect_toxic_content(request.question)
            if is_toxic:
                language = detect_language(request.question)
                if language == "tagalog":
                    response = "Naiintindihan ko na baka frustrated ka, pero nandito ako para magbigay ng helpful legal information. Pakiusap, magtanong nang may respeto. 😊"
                else:
                    response = "I understand you may be frustrated, but I'm here to provide helpful legal information. Please rephrase your question respectfully. 😊"
                yield f"data: {json.dumps({'content': response, 'done': True})}\n\n"
                return
            
            # Detect language
            language = detect_language(request.question)
            
            # Send initial metadata
            yield f"data: {json.dumps({'type': 'metadata', 'language': language})}\n\n"
            
            # Check if legal question
            if not is_legal_question(request.question):
                casual_response = generate_ai_response(request.question, language, 'casual')
                yield f"data: {json.dumps({'content': casual_response, 'done': True})}\n\n"
                return
            
            # Query normalization (if needed)
            search_query = request.question
            informal_patterns = ['tangina', 'puta', 'gago', 'walang dahilan', 'nambabae', 'nanlalaki']
            needs_normalization = any(pattern in request.question.lower() for pattern in informal_patterns)
            
            if needs_normalization:
                search_query = normalize_emotional_query(request.question, language)
            
            # Vector search
            context, sources = retrieve_relevant_context(search_query, TOP_K_RESULTS)
            
            if not sources:
                no_context_message = (
                    "I apologize, but I don't have enough information in my database to answer this question accurately."
                    if language == "english" else
                    "Paumanhin po, pero wala akong sapat na impormasyon sa aking database para masagot ito nang tama."
                )
                yield f"data: {json.dumps({'content': no_context_message, 'done': True})}\n\n"
                return
            
            # Send sources
            source_citations = [
                {
                    'source': src['source'],
                    'law': src['law'],
                    'article_number': src['article_number'],
                    'article_title': src['article_title'],
                    'source_url': src.get('source_url', ''),
                    'relevance_score': src.get('relevance_score', 0.0)
                }
                for src in sources
            ]
            yield f"data: {json.dumps({'type': 'sources', 'sources': source_citations})}\n\n"
            
            # Build messages for streaming
            system_prompt = ENGLISH_SYSTEM_PROMPT if language == "english" else TAGALOG_SYSTEM_PROMPT
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add conversation history (last 1 exchange)
            for msg in request.conversation_history[-1:]:
                messages.append(msg)
            
            # Add current question with context
            if context and context.strip():
                user_message = f"""Legal Context:
{context}

User Question: {request.question}

Please provide an informational response based on the legal context above."""
            else:
                user_message = f"""User Question: {request.question}

Note: I don't have specific legal documents for this question. Please provide a helpful answer based on general knowledge of Philippine law."""
            
            messages.append({"role": "user", "content": user_message})
            
            # STREAMING: Generate response with OpenAI streaming
            full_answer = ""
            stream = openai_client.chat.completions.create(
                model=CHAT_MODEL,
                messages=messages,
                max_tokens=request.max_tokens,
                temperature=0.5,
                top_p=0.95,
                stream=True,  # Enable streaming!
                timeout=10.0
            )
            
            # Stream tokens as they arrive
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_answer += content
                    yield f"data: {json.dumps({'content': content})}\n\n"
            
            # Send completion signal
            total_time = time.time() - perf_start
            yield f"data: {json.dumps({'done': True, 'total_time': total_time})}\n\n"
            
            # Save to chat history (async, don't block)
            if effective_user_id:
                try:
                    await save_chat_interaction(
                        chat_service=chat_service,
                        effective_user_id=effective_user_id,
                        session_id=request.session_id,
                        question=request.question,
                        answer=full_answer,
                        language=language,
                        metadata={
                            "sources": source_citations,
                            "streaming": True
                        }
                    )
                except Exception as e:
                    print(f"Failed to save chat history: {e}")
            
        except Exception as e:
            print(f"Streaming error: {e}")
            yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
