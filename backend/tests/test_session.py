import asyncio

import pytest

from app.core.session import Session, SessionState


@pytest.mark.asyncio
async def test_reset_idle_clears_state_and_cancels_pending_timeout() -> None:
    session = Session()
    session.state = SessionState.PENDING
    session.activeClientId = "sender-test"
    timeoutTask = asyncio.create_task(asyncio.sleep(60))
    session.pendingTimeoutTask = timeoutTask

    session.resetIdle()
    await asyncio.sleep(0)

    assert session.state == SessionState.IDLE
    assert session.activeClientId is None
    assert session.pendingTimeoutTask is None
    assert timeoutTask.cancelled()
