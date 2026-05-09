"""
ForensikGaji Backend - Case Storage Service

This module handles persistent storage of audit cases using JSON files.
For production, this should be replaced with a proper database (PostgreSQL, MongoDB, etc.).

Author: ForensikGaji Team
Created: May 2026
"""

import json
import os
from typing import List, Optional
from datetime import datetime
from models import AuditCase, CaseData, FileData


CASES_FILE = "cases.json"


def load_cases() -> List[AuditCase]:
    """Load all cases from the JSON file."""
    if not os.path.exists(CASES_FILE):
        return []

    try:
        with open(CASES_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return [AuditCase(**case) for case in data if case]
    except Exception as e:
        print(f"Error loading cases: {e}")
        return []


def save_cases(cases: List[AuditCase]) -> bool:
    """Save all cases to the JSON file."""
    try:
        with open(CASES_FILE, 'w', encoding='utf-8') as f:
            json.dump([case.model_dump() for case in cases], f, indent=2, default=str)
        return True
    except Exception as e:
        print(f"Error saving cases: {e}")
        return False


def create_case(name: str, doc_types: List[str], base_url: str) -> AuditCase:
    """Create a new audit case."""
    import random

    # Generate unique ID
    case_id = f"req-{random.randint(1000, 9999)}"

    # Create the case
    new_case = AuditCase(
        id=case_id,
        name=name,
        type=" + ".join(doc_types),
        status="waiting",
        link=f"{base_url}?upload={case_id}"
    )

    # Save to storage
    cases = load_cases()
    cases.insert(0, new_case)  # Add to beginning
    save_cases(cases)

    return new_case


def get_case(case_id: str) -> Optional[AuditCase]:
    """Get a specific case by ID."""
    cases = load_cases()
    for case in cases:
        if case.id == case_id:
            return case
    return None


def get_all_cases() -> List[AuditCase]:
    """Get all cases."""
    return load_cases()


def update_case(case_id: str, **updates) -> Optional[AuditCase]:
    """Update a case with new data."""
    cases = load_cases()

    for i, case in enumerate(cases):
        if case.id == case_id:
            # Update the case
            case_dict = case.model_dump()
            case_dict.update(updates)
            case_dict['updated_at'] = datetime.now().isoformat()

            # Create updated case
            updated_case = AuditCase(**case_dict)
            cases[i] = updated_case

            # Save
            save_cases(cases)
            return updated_case

    return None


def add_files_to_case(case_id: str, files: List[FileData]) -> Optional[AuditCase]:
    """Add analyzed files to a case."""
    case = get_case(case_id)
    if not case:
        return None

    # Get existing files or initialize
    if case.data:
        existing_files = case.data.files or []
        # Merge files (avoid duplicates by name)
        existing_names = {f.name for f in existing_files}
        for new_file in files:
            if new_file.name not in existing_names:
                existing_files.append(new_file)

        # Calculate new average score
        avg_score = int(sum(f.score for f in existing_files) / len(existing_files)) if existing_files else 0

        # Update case data
        case_data = CaseData(
            score=avg_score,
            date=case.data.date or datetime.now().isoformat(),
            clash_detected=case.data.clash_detected,
            files=existing_files
        )
    else:
        # First files - calculate average
        avg_score = int(sum(f.score for f in files) / len(files)) if files else 0

        case_data = CaseData(
            score=avg_score,
            date=datetime.now().isoformat(),
            clash_detected=False,
            files=files
        )

    return update_case(case_id, data=case_data, status="completed")


def delete_case(case_id: str) -> bool:
    """Delete a case by ID."""
    cases = load_cases()
    original_length = len(cases)
    cases = [c for c in cases if c.id != case_id]

    if len(cases) < original_length:
        save_cases(cases)
        return True
    return False
