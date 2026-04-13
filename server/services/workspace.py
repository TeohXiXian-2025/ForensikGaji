# Note: Full OAuth2 implementation for Workspace requires setting up a consent screen.
# This is a hackathon-ready simulation of the Calendar API payload.
import uuid


def create_expert_interview_meet(candidate_email: str, expert_email: str, date: str) -> str:
    """Simulates creating a Google Calendar event with a Google Meet link."""
    # In a full production build, you use the google-api-python-client here
    # to hit the calendar.events().insert endpoint with conferenceDataVersion=1

    mock_meet_id = str(uuid.uuid4())[:10]
    return f"https://meet.google.com/{mock_meet_id}"
