#!/bin/bash
# Guardrails AI Installation Script for Linux/Mac
# AI.ttorney Lawyer Chatbot Security Setup

echo "========================================"
echo "  Guardrails AI Installation Script"
echo "  AI.ttorney Lawyer Chatbot"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check Python version
echo -e "${YELLOW}Step 1: Checking Python version...${NC}"
PYTHON_VERSION=$(python3 --version 2>&1)
echo -e "  ${GREEN}$PYTHON_VERSION${NC}"

if [[ $PYTHON_VERSION == *"3.13"* ]]; then
    echo -e "  ${RED}⚠️  WARNING: Python 3.13 detected!${NC}"
    echo -e "  ${RED}Guardrails AI has compatibility issues with Python 3.13${NC}"
    echo -e "  ${YELLOW}Recommended: Use Python 3.11 or 3.12 for full functionality${NC}"
    echo ""
    read -p "Continue with limited functionality? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Installation cancelled.${NC}"
        exit 1
    fi
elif [[ $PYTHON_VERSION == *"3.11"* ]] || [[ $PYTHON_VERSION == *"3.12"* ]]; then
    echo -e "  ${GREEN}✅ Python version is compatible!${NC}"
else
    echo -e "  ${YELLOW}⚠️  Python 3.11 or 3.12 recommended for best compatibility${NC}"
fi

echo ""

# Step 2: Install Guardrails AI Core
echo -e "${YELLOW}Step 2: Installing Guardrails AI core...${NC}"
pip3 install guardrails-ai
if [ $? -ne 0 ]; then
    echo -e "  ${RED}❌ Failed to install Guardrails AI${NC}"
    exit 1
fi
echo -e "  ${GREEN}✅ Guardrails AI core installed${NC}"
echo ""

# Step 3: Install core dependencies
echo -e "${YELLOW}Step 3: Installing core dependencies...${NC}"
pip3 install torch transformers peft jinja2
if [ $? -ne 0 ]; then
    echo -e "  ${YELLOW}⚠️  Some dependencies failed to install${NC}"
    echo -e "  ${YELLOW}This is expected on Python 3.13${NC}"
else
    echo -e "  ${GREEN}✅ Core dependencies installed${NC}"
fi
echo ""

# Step 4: Configure Guardrails Hub
echo -e "${YELLOW}Step 4: Configuring Guardrails Hub...${NC}"
echo -e "  ${CYAN}You may need to provide your Guardrails API key${NC}"
guardrails configure
echo ""

# Step 5: Install validators
echo -e "${YELLOW}Step 5: Installing Guardrails validators...${NC}"

validators=(
    "hub://guardrails/toxic_language"
    "hub://guardrails/bias_check"
    "hub://guardrails/sensitive_topics"
    "hub://guardrails/restrict_to_topic"
    "hub://guardrails/regex_match"
)

for validator in "${validators[@]}"; do
    echo -e "  ${CYAN}Installing $validator...${NC}"
    guardrails hub install "$validator"
    if [ $? -eq 0 ]; then
        echo -e "    ${GREEN}✅ Installed${NC}"
    else
        echo -e "    ${YELLOW}⚠️  Failed to install${NC}"
    fi
done

echo ""

# Step 6: Install advanced validators (optional)
echo -e "${YELLOW}Step 6: Installing advanced validators (optional)...${NC}"
echo -e "  ${CYAN}These may take longer and require more dependencies${NC}"

advanced_validators=(
    "hub://guardrails/llamaguard_7b"
    "hub://groundedai/grounded_ai_hallucination"
)

read -p "Install advanced validators? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    for validator in "${advanced_validators[@]}"; do
        echo -e "  ${CYAN}Installing $validator...${NC}"
        guardrails hub install "$validator"
        if [ $? -eq 0 ]; then
            echo -e "    ${GREEN}✅ Installed${NC}"
        else
            echo -e "    ${YELLOW}⚠️  Failed to install${NC}"
        fi
    done
else
    echo -e "  ${YELLOW}Skipping advanced validators${NC}"
fi

echo ""

# Step 7: Verify installation
echo -e "${YELLOW}Step 7: Verifying installation...${NC}"
guardrails hub list
echo ""

# Step 8: Test configuration
echo -e "${YELLOW}Step 8: Testing Guardrails configuration...${NC}"
python3 -c "from config.guardrails_config import get_guardrails_instance; print('✅ Guardrails loaded successfully')"
if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✅ Configuration test passed${NC}"
else
    echo -e "  ${YELLOW}⚠️  Configuration test failed${NC}"
    echo -e "  ${YELLOW}Check that config/guardrails_config.py exists${NC}"
fi

echo ""

# Step 9: Environment variables check
echo -e "${YELLOW}Step 9: Checking environment variables...${NC}"
if [ -f ".env" ]; then
    if grep -q "ENABLE_GUARDRAILS" .env; then
        echo -e "  ${GREEN}✅ ENABLE_GUARDRAILS found in .env${NC}"
    else
        echo -e "  ${YELLOW}⚠️  ENABLE_GUARDRAILS not found in .env${NC}"
        echo -e "  ${CYAN}Add the following to your .env file:${NC}"
        echo ""
        echo "  ENABLE_GUARDRAILS=true"
        echo "  GUARDRAILS_STRICT_MODE=true"
        echo "  GUARDRAILS_LOG_SECURITY_EVENTS=true"
        echo "  GUARDRAILS_MAX_RETRIES=2"
        echo "  GUARDRAILS_TIMEOUT_SECONDS=30"
    fi
else
    echo -e "  ${YELLOW}⚠️  .env file not found${NC}"
    echo -e "  ${YELLOW}Create a .env file with Guardrails configuration${NC}"
fi

echo ""

# Final summary
echo "========================================"
echo -e "  ${GREEN}Installation Complete!${NC}"
echo "========================================"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Ensure .env file has Guardrails configuration"
echo "  2. Run test suite: python3 data/test_guardrails.py"
echo "  3. Review GUARDRAILS_SETUP.md for detailed documentation"
echo ""
echo -e "${YELLOW}For support, check:${NC}"
echo -e "  ${CYAN}- https://docs.guardrailsai.com/${NC}"
echo -e "  ${CYAN}- GUARDRAILS_SETUP.md in project root${NC}"
echo ""
