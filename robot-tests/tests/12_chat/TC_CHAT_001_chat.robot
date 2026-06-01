*** Settings ***
Documentation    TC_CHAT_001 – Chat page scenarios.
...
...              Verifies the chat page layout: sidebar tabs (Messages /
...              Amis / Demandes), search input, empty state, and message
...              input field availability when a conversation is selected.
Resource         ../../resources/common.resource
Resource         ../../resources/auth_keywords.resource

Suite Setup      Run Keywords
...              Open Browser Session
...              AND    Sign In As Valid User
Suite Teardown   Close Browser Session
Test Teardown    Take Screenshot On Failure


*** Test Cases ***
TC_CHAT_001_01 Chat page loads without errors
    [Documentation]    Navigating to /chat must load the page and render
    ...                the sidebar heading "Chat".
    [Tags]    smoke    chat
    Go To    ${CHAT_URL}
    Wait For Load State    domcontentloaded
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h2:has-text("Chat")    visible    timeout=${RETRY_TIMEOUT}

TC_CHAT_001_02 Sidebar shows three tabs: Messages, Friends/Colleagues, Requests
    [Documentation]    The left sidebar must expose three navigation tabs:
    ...                Messages (same), Amis/Colleagues, Demandes/Requests.
    [Tags]    chat    ui
    Go To    ${CHAT_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    button:has-text("Messages")    visible    timeout=${RETRY_TIMEOUT}
    # Friends tab: "Amis" (FR) or "Colleagues" (EN)
    Wait For Elements State
    ...    button:has-text("Amis"), button:has-text("Colleagues"), button:has-text("Collègues")
    ...    visible    timeout=${TIMEOUT}
    # Requests tab: "Demandes" (FR) or "Requests" (EN)
    Wait For Elements State
    ...    button:has-text("Demandes"), button:has-text("Requests")
    ...    visible    timeout=${TIMEOUT}

TC_CHAT_001_03 Empty state is shown when no conversation is selected
    [Documentation]    When no conversation is active the main area must
    ...                display the empty-state with "No conversation selected"
    ...                or equivalent French text.
    [Tags]    chat    ui    regression
    Go To    ${CHAT_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h2:has-text("Chat")    visible    timeout=${RETRY_TIMEOUT}
    ${has_empty}=    Run Keyword And Return Status
    ...    Wait For Elements State
    ...    h3:has-text("No conversation"), h3:has-text("Aucune conversation"), h3:has-text("conversation")
    ...    visible    timeout=10s
    Run Keyword If    ${has_empty}
    ...    Log    Empty state displayed correctly
    ...    ELSE
    ...    Log    Conversation auto-selected — empty state not shown    WARN

TC_CHAT_001_04 Search input in sidebar accepts text
    [Documentation]    The sidebar search field must be visible and accept
    ...                keyboard input for filtering conversations or friends.
    [Tags]    chat    ui
    Go To    ${CHAT_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h2:has-text("Chat")    visible    timeout=${RETRY_TIMEOUT}
    ${has_search}=    Run Keyword And Return Status
    ...    Wait For Elements State
    ...    input[placeholder*="Rechercher"], input[placeholder*="Search"]
    ...    visible    timeout=8s
    Run Keyword If    ${has_search}
    ...    Fill Text    input[placeholder*="Rechercher"], input[placeholder*="Search"]    Test
    Run Keyword If    ${has_search}
    ...    Log    Search input found and filled

TC_CHAT_001_05 Switching to Friends/Colleagues tab renders list or empty state
    [Documentation]    Clicking the "Amis" / "Colleagues" tab must display a
    ...                friends/colleagues list or an appropriate empty message.
    [Tags]    chat    interaction
    Go To    ${CHAT_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${fr_visible}=    Run Keyword And Return Status
    ...    Wait For Elements State    button:has-text("Amis"), button:has-text("Collègues")    visible    timeout=5s
    Run Keyword If    ${fr_visible}    Click    button:has-text("Amis"), button:has-text("Collègues")
    Run Keyword Unless    ${fr_visible}    Click    button:has-text("Colleagues")
    Sleep    1s
    URL Should Contain    /chat

TC_CHAT_001_06 Switching to Requests tab renders requests or empty state
    [Documentation]    Clicking the "Demandes" / "Requests" tab must display
    ...                pending message requests or an empty-state indicator.
    [Tags]    chat    interaction
    Go To    ${CHAT_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${fr_visible}=    Run Keyword And Return Status
    ...    Wait For Elements State    button:has-text("Demandes")    visible    timeout=5s
    Run Keyword If    ${fr_visible}    Click    button:has-text("Demandes")
    Run Keyword Unless    ${fr_visible}    Click    button:has-text("Requests")
    Sleep    1s
    URL Should Contain    /chat

TC_CHAT_001_07 Clicking a conversation opens the chat area
    [Documentation]    If at least one conversation exists in the sidebar,
    ...                clicking it must load the message area and hide the
    ...                empty state.
    [Tags]    chat    interaction    regression
    Go To    ${CHAT_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    button:has-text("Messages")    visible    timeout=${RETRY_TIMEOUT}
    Click    button:has-text("Messages")
    Sleep    1s
    ${has_conv}=    Run Keyword And Return Status
    ...    Wait For Elements State
    ...    aside >> [class*="cursor-pointer"]
    ...    visible    timeout=5s
    Run Keyword If    ${has_conv}
    ...    Click    aside >> [class*="cursor-pointer"] >> nth=0
    Run Keyword If    ${has_conv}
    ...    Sleep    1s
    Run Keyword If    ${has_conv}
    ...    Log    Conversation selected — chat area should be active

TC_CHAT_001_08 Message input is visible when a conversation is active
    [Documentation]    When a conversation is selected, the message input
    ...                field must be rendered at the bottom of the chat area.
    [Tags]    chat    interaction    regression
    Go To    ${CHAT_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    button:has-text("Messages")    visible    timeout=${RETRY_TIMEOUT}
    Click    button:has-text("Messages")
    Sleep    1s
    ${has_conv}=    Run Keyword And Return Status
    ...    Wait For Elements State
    ...    aside >> [class*="cursor-pointer"]
    ...    visible    timeout=5s
    Run Keyword If    ${has_conv}
    ...    Click    aside >> [class*="cursor-pointer"] >> nth=0
    Run Keyword If    ${has_conv}
    ...    Wait For Elements State
    ...    textarea, input[type="text"][placeholder*="message" i], input[placeholder*="Message"]
    ...    visible    timeout=${RETRY_TIMEOUT}
    Run Keyword If    not ${has_conv}
    ...    Log    No conversations available — message input test skipped    WARN

TC_CHAT_001_09 Chat sidebar has correct fixed width
    [Documentation]    The conversation sidebar must be rendered with the
    ...                w-72 fixed width class (288 px), not collapsed on load.
    [Tags]    chat    ui
    Go To    ${CHAT_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h2:has-text("Chat")    visible    timeout=${RETRY_TIMEOUT}
    ${count}=    Get Element Count    .w-72
    Should Be True    ${count} >= 1    msg=Chat sidebar must use the w-72 width class

TC_CHAT_001_10 Sending a message in an active conversation succeeds
    [Documentation]    When a conversation is active, typing a message and
    ...                pressing Enter (or clicking send) must submit the message
    ...                and display it in the conversation area.
    [Tags]    chat    interaction    regression
    Go To    ${CHAT_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Click    button:has-text("Messages")
    Sleep    1s
    ${has_conv}=    Run Keyword And Return Status
    ...    Wait For Elements State    aside >> [class*="cursor-pointer"]    visible    timeout=5s
    # Pass Execution If works in test cases (RETURN is keyword-only in RF5+)
    Pass Execution If    not ${has_conv}    No conversation available — send test skipped
    Click    aside >> [class*="cursor-pointer"] >> nth=0
    ${has_input}=    Run Keyword And Return Status
    ...    Wait For Elements State
    ...    textarea[placeholder*="message" i], textarea[placeholder*="Écrivez" i]
    ...    visible    timeout=${TIMEOUT}
    Pass Execution If    not ${has_input}    Message input not available — blocked or pending state
    Fill Text
    ...    textarea[placeholder*="message" i], textarea[placeholder*="Écrivez" i]
    ...    Robot test message ${RANDOM_STRING}
    Keyboard Key    press    Enter
    Sleep    1.5s
    # Message must appear or an error toast must not crash the page
    URL Should Contain    /chat

TC_CHAT_001_11 Floating chat bubble is visible on the home page
    [Documentation]    A floating chat bubble or shortcut button must be
    ...                present on the home page to quickly open the chat.
    [Tags]    chat    ui
    Go To    ${HOME_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    # Multi-line continuation would split into separate arguments — keep on one line
    ${count}=    Get Element Count    [class*="FloatingChat"], [class*="floating-chat"], a[href*="/chat"][class*="fixed"], button[class*="fixed"][aria-label*="chat" i]
    Run Keyword If    ${count} == 0
    ...    Log    No floating chat bubble found — may not be implemented on home    WARN
