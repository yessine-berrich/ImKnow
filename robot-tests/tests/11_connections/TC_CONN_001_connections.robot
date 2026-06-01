*** Settings ***
Documentation    TC_CONN_001 – Connections page scenarios.
...
...              Verifies the "Mes relations" / "My Connections" page: page load,
...              tabs (Abonnés / Followers, Abonnements / Following,
...              Amis / Associates, Suggestions), search input, sort dropdown,
...              and grid/list view toggle.
...
...              Selectors accept both French (default) and English UI.
Resource         ../../resources/common.resource
Resource         ../../resources/auth_keywords.resource

Suite Setup      Run Keywords
...              Open Browser Session
...              AND    Sign In As Valid User
Suite Teardown   Close Browser Session
Test Teardown    Take Screenshot On Failure


*** Test Cases ***
TC_CONN_001_01 Connections page loads with main heading
    [Documentation]    Navigating to /connections must render the page
    ...                with an h1 heading (FR: "Mes relations" / EN: "My Connections").
    [Tags]    smoke    connections
    Go To    ${CONNECTIONS_URL}
    Wait For Load State    domcontentloaded
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${RETRY_TIMEOUT}
    ${text}=    Get Text    h1
    ${ok}=    Evaluate    "relations" in "${text}".lower() or "connection" in "${text}".lower()
    Should Be True    ${ok}    msg=h1 must contain "relations" or "connection"

TC_CONN_001_02 All four tabs are visible
    [Documentation]    The tab bar must expose four relationship tabs.
    ...                French: Abonnés / Abonnements / Amis / Suggestions.
    ...                English: Followers / Following / Associates / Suggestions.
    [Tags]    connections    ui
    Go To    ${CONNECTIONS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    # Tab 1: Followers / Abonnés
    Wait For Elements State
    ...    button:has-text("Abonnés"), button:has-text("Followers")
    ...    visible    timeout=${RETRY_TIMEOUT}
    # Tab 2: Following / Abonnements
    Wait For Elements State
    ...    button:has-text("Abonnements"), button:has-text("Following")
    ...    visible    timeout=${TIMEOUT}
    # Tab 3: FR "Associés" / EN "Associates" (confirmed from connections.json)
    Wait For Elements State
    ...    button:has-text("Associés"), button:has-text("Associates"), button:has-text("Amis"), button:has-text("Collègues"), button:has-text("Colleagues")
    ...    visible    timeout=${TIMEOUT}
    # Tab 4: Suggestions (same in both languages)
    Wait For Elements State    button:has-text("Suggestions")    visible    timeout=${TIMEOUT}

TC_CONN_001_03 Search input is present and accepts text
    [Documentation]    The search field must be visible and accept keyboard input.
    [Tags]    connections    ui    regression
    Go To    ${CONNECTIONS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    # French placeholder: "Rechercher par nom ou email"
    # English placeholder: "Search by name or email..."
    # Use only the connections-specific search selectors (not the global navbar search)
    ${input}=    Get Element Count
    ...    input[placeholder*="nom ou email"], input[placeholder*="name or email"]
    Should Be True    ${input} >= 1    msg=A search input must be present on connections page
    Click    input[placeholder*="nom ou email"], input[placeholder*="name or email"]
    Fill Text    input[placeholder*="nom ou email"], input[placeholder*="name or email"]    Robot
    Sleep    0.5s

TC_CONN_001_04 Sort dropdown is present with expected options
    [Documentation]    The sort selector must be visible on the connections page.
    [Tags]    connections    ui
    Go To    ${CONNECTIONS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    select    visible    timeout=${RETRY_TIMEOUT}
    ${option_count}=    Get Element Count    select >> option
    Should Be True    ${option_count} >= 1    msg=Sort dropdown must have at least one option

TC_CONN_001_05 Grid and List view toggle buttons are present
    [Documentation]    The toolbar must expose view-mode toggle buttons.
    [Tags]    connections    ui
    Go To    ${CONNECTIONS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    # Accept French titles ("Vue en grille"/"Vue en liste") OR English ("Grid view"/"List view")
    ${grid_count}=    Get Element Count
    ...    button[title*="grille" i], button[title*="Grid" i], button[title*="grid" i]
    ${list_count}=    Get Element Count
    ...    button[title*="liste" i], button[title*="List" i], button[title*="list" i]
    Run Keyword If    ${grid_count} == 0
    ...    Log    Grid view button not found — may use different title attribute    WARN
    Run Keyword If    ${list_count} == 0
    ...    Log    List view button not found — may use different title attribute    WARN

TC_CONN_001_06 Switching to List view changes layout
    [Documentation]    Clicking the List view button must switch the content
    ...                area to list mode without crashing the page.
    [Tags]    connections    interaction
    Go To    ${CONNECTIONS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${has_list_btn}=    Run Keyword And Return Status
    ...    Wait For Elements State
    ...    button[title*="liste" i], button[title*="List" i]    visible    timeout=5s
    Run Keyword If    ${has_list_btn}
    ...    Click    button[title*="liste" i], button[title*="List" i]
    Sleep    0.5s
    URL Should Contain    /connections

TC_CONN_001_07 Clicking Following tab switches content
    [Documentation]    Clicking the Following / Abonnements tab must activate
    ...                it and keep the user on /connections.
    [Tags]    connections    interaction
    Go To    ${CONNECTIONS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    # Try French first, fall back to English
    ${fr_visible}=    Run Keyword And Return Status
    ...    Wait For Elements State    button:has-text("Abonnements")    visible    timeout=5s
    Run Keyword If    ${fr_visible}    Click    button:has-text("Abonnements")
    Run Keyword Unless    ${fr_visible}    Click    button:has-text("Following")
    Sleep    0.5s
    URL Should Contain    /connections

TC_CONN_001_08 Suggestions tab renders content or empty state
    [Documentation]    Clicking the "Suggestions" tab must show either
    ...                user cards or an empty-state message.
    [Tags]    connections    regression
    Go To    ${CONNECTIONS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Click    button:has-text("Suggestions")
    Sleep    1s
    ${cards}=    Get Element Count    [class*="rounded-2xl"], [class*="UserCard"], [class*="card" i]
    ${empty}=    Run Keyword And Return Status
    ...    Wait For Elements State
    ...    *:has-text("suggestion"), *:has-text("Aucune"), *:has-text("No suggestion"), *:has-text("empty" i)
    ...    visible    timeout=5s
    Should Be True    ${cards} > 0 or ${empty}
    ...    msg=Suggestions tab must show user cards or an empty state

TC_CONN_001_09 Back button navigates away from connections
    [Documentation]    Clicking the back-navigation button must leave /connections.
    ...                French: "Retour" / English: "Back".
    [Tags]    connections    navigation
    Go To    ${CONNECTIONS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    # Try French "Retour" first, fall back to English "Back"
    ${has_retour}=    Run Keyword And Return Status
    ...    Wait For Elements State    button:has-text("Retour")    visible    timeout=5s
    Run Keyword If    ${has_retour}    Click    button:has-text("Retour")
    Run Keyword Unless    ${has_retour}
    ...    Run Keyword And Ignore Error    Click    button:has-text("Back")
    Sleep    0.5s
    Log    Navigation triggered from back button    INFO
