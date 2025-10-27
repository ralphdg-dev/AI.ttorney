import json
import time
import os
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from difflib import SequenceMatcher
import re
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class LawyerRecord:
    lastname: str
    firstname: str
    middle_name: str
    address: str
    roll_signed_date: str
    roll_no: str

@dataclass
class LawyerApplication:
    applicant_name: str
    first_name: str
    last_name: str
    middle_name: Optional[str] = None
    address: Optional[str] = None
    roll_number: Optional[str] = None
    application_id: str = ""

@dataclass
class VerificationResult:
    is_verified: bool
    confidence: float
    matches: List[LawyerRecord]
    match_type: str  # 'EXACT', 'PARTIAL', 'MULTIPLE', 'NONE'
    processing_time: float
    similarity_scores: List[float] = None

class LawyerVerificationService:
    def __init__(self, database_path: Optional[str] = None):
        self.database_path = database_path or os.path.join(
            os.path.dirname(__file__), '../../../data/lawyers_list.json'
        )
        self.lawyers_database: List[LawyerRecord] = []
        self.load_database()

    def load_database(self) -> None:
        """Load the lawyers database from JSON file."""
        try:
            start_time = time.time()
            with open(self.database_path, 'r', encoding='utf-8') as file:
                raw_data = json.load(file)
            
            self.lawyers_database = [
                LawyerRecord(
                    lastname=record.get('Lastname', ''),
                    firstname=record.get('Firstname', ''),
                    middle_name=record.get('Middle Name', ''),
                    address=record.get('Address', ''),
                    roll_signed_date=record.get('Roll Signed Date', ''),
                    roll_no=record.get('Roll No.', '')
                )
                for record in raw_data
            ]
            
            load_time = time.time() - start_time
            logger.info(f"Database loaded: {len(self.lawyers_database)} records in {load_time:.3f}s")
            
        except FileNotFoundError:
            logger.error(f"Database file not found: {self.database_path}")
            raise Exception("Database unavailable")
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON in database file: {self.database_path}")
            raise Exception("Database unavailable")
        except Exception as e:
            logger.error(f"Failed to load database: {str(e)}")
            raise Exception("Database unavailable")

    def verify_lawyer(self, application: LawyerApplication) -> VerificationResult:
        """Verify a single lawyer application."""
        start_time = time.time()
        
        try:
            # Normalize application data
            normalized_app = self._normalize_application_data(application)
            
            # Search for matches
            matches, scores = self._find_matches(normalized_app)
            
            # Analyze matches
            result = self._analyze_matches(matches, scores, normalized_app)
            
            processing_time = time.time() - start_time
            
            return VerificationResult(
                is_verified=result['is_verified'],
                confidence=result['confidence'],
                matches=matches,
                match_type=result['match_type'],
                processing_time=processing_time,
                similarity_scores=scores
            )
            
        except Exception as e:
            logger.error(f"Verification failed: {str(e)}")
            return VerificationResult(
                is_verified=False,
                confidence=0.0,
                matches=[],
                match_type='NONE',
                processing_time=time.time() - start_time
            )

    def bulk_verify_lawyers(self, applications: List[LawyerApplication]) -> List[VerificationResult]:
        """Verify multiple lawyer applications."""
        start_time = time.time()
        results = []
        
        for i, application in enumerate(applications):
            logger.info(f"Processing application {i+1}/{len(applications)}: {application.applicant_name}")
            result = self.verify_lawyer(application)
            results.append(result)
        
        total_time = time.time() - start_time
        logger.info(f"Bulk verification completed: {len(applications)} applications in {total_time:.3f}s")
        
        return results

    def _normalize_application_data(self, application: LawyerApplication) -> LawyerApplication:
        """Normalize application data for consistent matching."""
        return LawyerApplication(
            applicant_name=self._normalize_string(application.applicant_name),
            first_name=self._normalize_string(application.first_name),
            last_name=self._normalize_string(application.last_name),
            middle_name=self._normalize_string(application.middle_name) if application.middle_name else None,
            address=self._normalize_string(application.address) if application.address else None,
            roll_number=application.roll_number,
            application_id=application.application_id
        )

    def _normalize_string(self, text: str) -> str:
        """Normalize string for consistent comparison."""
        if not text:
            return ""
        
        # Remove extra spaces and convert to uppercase
        normalized = re.sub(r'\s+', ' ', text.strip().upper())
        
        # Handle special characters commonly found in Filipino names
        normalized = normalized.replace('Ñ', 'N').replace('ñ', 'n')
        
        return normalized

    def _find_matches(self, application: LawyerApplication) -> Tuple[List[LawyerRecord], List[float]]:
        """Find matching lawyers in the database."""
        matches = []
        scores = []
        
        for lawyer in self.lawyers_database:
            score = self._calculate_similarity_score(application, lawyer)
            if score > 0.6:  # 60% similarity threshold
                matches.append(lawyer)
                scores.append(score)
        
        # Sort by similarity score (highest first)
        if matches:
            sorted_pairs = sorted(zip(matches, scores), key=lambda x: x[1], reverse=True)
            matches, scores = zip(*sorted_pairs)
            matches, scores = list(matches), list(scores)
        
        return matches, scores

    def _calculate_similarity_score(self, application: LawyerApplication, lawyer: LawyerRecord) -> float:
        """Calculate similarity score between application and lawyer record."""
        total_score = 0.0
        total_weight = 0.0
        
        # First name comparison (weight: 30%)
        if application.first_name and lawyer.firstname:
            first_name_score = self._string_similarity(
                application.first_name, 
                self._normalize_string(lawyer.firstname)
            )
            total_score += first_name_score * 0.3
            total_weight += 0.3
        
        # Last name comparison (weight: 40%)
        if application.last_name and lawyer.lastname:
            last_name_score = self._string_similarity(
                application.last_name, 
                self._normalize_string(lawyer.lastname)
            )
            total_score += last_name_score * 0.4
            total_weight += 0.4
        
        # Middle name comparison (weight: 20%)
        if application.middle_name and lawyer.middle_name:
            middle_name_score = self._string_similarity(
                application.middle_name, 
                self._normalize_string(lawyer.middle_name)
            )
            total_score += middle_name_score * 0.2
            total_weight += 0.2
        
        # Address comparison (weight: 10%)
        if application.address and lawyer.address:
            address_score = self._string_similarity(
                application.address, 
                self._normalize_string(lawyer.address)
            )
            total_score += address_score * 0.1
            total_weight += 0.1
        
        return total_score / total_weight if total_weight > 0 else 0.0

    def _string_similarity(self, str1: str, str2: str) -> float:
        """Calculate string similarity using SequenceMatcher."""
        if not str1 or not str2:
            return 0.0
        
        if str1 == str2:
            return 1.0
        
        return SequenceMatcher(None, str1, str2).ratio()

    def _analyze_matches(self, matches: List[LawyerRecord], scores: List[float], 
                        application: LawyerApplication) -> Dict[str, Any]:
        """Analyze matches and determine verification result."""
        if not matches:
            return {
                'is_verified': False,
                'confidence': 0.0,
                'match_type': 'NONE'
            }
        
        if len(matches) == 1:
            confidence = scores[0] * 100
            return {
                'is_verified': confidence > 90,
                'confidence': round(confidence, 1),
                'match_type': 'EXACT' if confidence > 90 else 'PARTIAL'
            }
        
        # Multiple matches
        best_score = scores[0] * 100
        return {
            'is_verified': best_score > 95,  # Higher threshold for multiple matches
            'confidence': round(best_score, 1),
            'match_type': 'MULTIPLE'
        }

    def get_database_stats(self) -> Dict[str, Any]:
        """Get database statistics."""
        try:
            file_size = os.path.getsize(self.database_path)
            return {
                'total_records': len(self.lawyers_database),
                'database_size': f"{file_size / 1024 / 1024:.2f} MB",
                'file_path': self.database_path
            }
        except Exception as e:
            logger.error(f"Failed to get database stats: {str(e)}")
            return {
                'total_records': len(self.lawyers_database),
                'database_size': 'Unknown',
                'file_path': self.database_path
            }

    def search_lawyers_by_name(self, name: str, limit: int = 10) -> List[LawyerRecord]:
        """Search lawyers by name (utility method for testing)."""
        normalized_name = self._normalize_string(name)
        matches = []
        
        for lawyer in self.lawyers_database:
            full_name = f"{lawyer.firstname} {lawyer.lastname}".strip()
            if normalized_name.lower() in self._normalize_string(full_name).lower():
                matches.append(lawyer)
                if len(matches) >= limit:
                    break
        
        return matches
