import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from tqdm import tqdm
import time

                            
load_dotenv()

               
COLLECTION_NAME = "legal_knowledge"
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

                                              
SOURCE_URLS = {
    'consumer_act': 'https://lawphil.net/statutes/repacts/ra1992/ra_7394_1992.html',
    'revised_penal_code': 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/28/20426',
    'family_code': 'https://lawphil.net/executive/execord/eo1987/eo_209_1987.html',
    'labor_code': 'https://lawphil.net/statutes/presdecs/pd1974/pd_442_1974.html',
    'civil_code': 'https://lawphil.net/statutes/repacts/ra1949/ra_386_1949.html',
}

def connect_to_qdrant():
    """Connect to Qdrant Cloud"""
    print(f"🗄  Connecting to Qdrant Cloud...")
    
    if not QDRANT_URL or not QDRANT_API_KEY:
        raise ValueError("QDRANT_URL and QDRANT_API_KEY must be set in .env file")
    
    client = QdrantClient(
        url=QDRANT_URL,
        api_key=QDRANT_API_KEY,
    )
    
    print(f" Connected to Qdrant Cloud")
    return client


def get_all_points(client: QdrantClient):
    """Retrieve all points from the collection"""
    print(f"\n Retrieving all points from collection '{COLLECTION_NAME}'...")
    
                         
    collection_info = client.get_collection(collection_name=COLLECTION_NAME)
    total_points = collection_info.points_count
    print(f" Total points in collection: {total_points}")
    
                               
    all_points = []
    offset = None
    BATCH_SIZE = 100
    
    with tqdm(total=total_points, desc="Fetching points") as pbar:
        while True:
            result = client.scroll(
                collection_name=COLLECTION_NAME,
                limit=BATCH_SIZE,
                offset=offset,
                with_payload=True,
                with_vectors=False                                        
            )
            
            points, next_offset = result
            
            if not points:
                break
            
            all_points.extend(points)
            pbar.update(len(points))
            
            if next_offset is None:
                break
            
            offset = next_offset
    
    print(f" Retrieved {len(all_points)} points")
    return all_points


def update_metadata_with_urls(client: QdrantClient, points):
    """Update each point's metadata to include source URL"""
    print(f"\n Updating metadata with source URLs...")
    
    updated_count = 0
    skipped_count = 0
    vawc_count = 0
    BATCH_SIZE = 50
    
    for i in tqdm(range(0, len(points), BATCH_SIZE), desc="Updating batches"):
        batch_end = min(i + BATCH_SIZE, len(points))
        batch_points = points[i:batch_end]
        
        for point in batch_points:
            point_id = point.id
            payload = point.payload
            
                                      
            source = payload.get('source', '')
            topic = payload.get('topic', '')
            
                                         
            if 'source_url' in payload:
                skipped_count += 1
                continue
            
                                                                                    
            if source == 'family_code' and topic == 'VAWC':
                source_url = 'https://lawphil.net/statutes/repacts/ra2004/ra_9262_2004.html'
                vawc_count += 1
            else:
                                         
                source_url = SOURCE_URLS.get(source, '')
            
            if source_url:
                                        
                try:
                    client.set_payload(
                        collection_name=COLLECTION_NAME,
                        payload={'source_url': source_url},
                        points=[point_id],
                        wait=False
                    )
                    updated_count += 1
                except Exception as e:
                    print(f"\n  Failed to update point {point_id}: {str(e)}")
        
                                          
        time.sleep(0.1)
    
    print(f"\n Updated {updated_count} points with source URLs")
    print(f"    VAWC articles: {vawc_count}")
    print(f"    Other articles: {updated_count - vawc_count}")
    print(f"⏭  Skipped {skipped_count} points (already had URLs)")
    
    return updated_count


def verify_updates(client: QdrantClient):
    """Verify that URLs were added successfully"""
    print(f"\n Verifying updates...")
    
                             
    result = client.scroll(
        collection_name=COLLECTION_NAME,
        limit=5,
        with_payload=True,
        with_vectors=False
    )
    
    points, _ = result
    
    print(f"\n Sample points with URLs:")
    for i, point in enumerate(points, 1):
        payload = point.payload
        print(f"\n{i}. Source: {payload.get('source', 'Unknown')}")
        print(f"   Article: {payload.get('article_number', 'N/A')}")
        print(f"   URL: {payload.get('source_url', 'NO URL FOUND ')}")
        print(f"   Text preview: {payload.get('text', '')[:80]}...")


def main():
    """Main execution function"""
    print(" Starting Qdrant Metadata Update Process")
    print("=" * 60)
    print("This will add source URLs to existing points WITHOUT regenerating embeddings")
    print("=" * 60)
    
                       
    client = connect_to_qdrant()
    
                    
    points = get_all_points(client)
    
                     
    updated_count = update_metadata_with_urls(client, points)
    
                                    
    if updated_count > 0:
        print(f"\n⏳ Waiting for Qdrant to index updates...")
        time.sleep(5)
    
                    
    verify_updates(client)
    
    print("\n" + "=" * 60)
    print(" Metadata update complete!")
    print(f" Total points updated: {updated_count}")
    print("💰 Credits saved: No embeddings regenerated!")
    print("=" * 60)


if __name__ == "__main__":
    main()
