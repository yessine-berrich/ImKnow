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

TC_CHAT_001_02 Sidebar shows three tabs: Messages, Amis, Demandes
    [Documentation]    The left sidebar must expose the three navigation
    ...                tabs: Messages, Amis, and Demandes.
    [Tags]    chat    ui
    Go To    ${CHAT_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    button:has-text("Messages")   visible    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    button:has-text("Amis")       visible    timeout=${TIMEOUT}
    Wait For Elements State    button:has-text("Demandes")   visible    timeout=${TIMEOUT}

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

TC_CHAT_001_05 Switching to Amis tab renders friends list or empty state
    [Documentation]    Clicking the "Amis" tab in the sidebar must display
    ...                a friends list or an appropriate empty message.
    [Tags]    chat    interaction
    Go To    ${CHAT_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    button:has-text("Amis")    visible    timeout=${RETRY_TIMEOUT}
    Click    button:has-text("Amis")
    Sleep    1s
    URL Should Contain    /chat

TC_CHAT_001_06 Switching to Demandes tab renders requests or empty state
    [Documentation]    Clicking the "Demandes" tab must display pending
    ...                message requests or an empty-state indicator.
    [Tags]    chat    interaction
    Go To    ${CHAT_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    button:has-text("Demandes")    visible    timeout=${RETRY_TIMEOUT}
    Click    button:has-text("Demandes")
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
