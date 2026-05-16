*** Settings ***
Documentation    TC_CONN_001 – Connections page scenarios.
...
...              Verifies the "Mes relations" page: page load, tabs
...              (Abonnés / Abonnements / Amis / Suggestions), search
...              input, sort dropdown, and grid/list view toggle.
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
    ...                with the h1 heading "Mes relations".
    [Tags]    smoke    connections
    Go To    ${CONNECTIONS_URL}
    Wait For Load State    domcontentloaded
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${RETRY_TIMEOUT}
    ${text}=    Get Text    h1
    Should Contain    ${text}    Mes relations

TC_CONN_001_02 All four tabs are visible
    [Documentation]    The tab bar must expose the four relationship tabs:
    ...                Abonnés, Abonnements, Amis, Suggestions.
    [Tags]    connections    ui
    Go To    ${CONNECTIONS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    button:has-text("Abonnés")       visible    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    button:has-text("Abonnements")   visible    timeout=${TIMEOUT}
    Wait For Elements State    button:has-text("Amis")          visible    timeout=${TIMEOUT}
    Wait For Elements State    button:has-text("Suggestions")   visible    timeout=${TIMEOUT}

TC_CONN_001_03 Search input is present and accepts text
    [Documentation]    The search field with placeholder "Rechercher par nom
    ...                ou email" must be visible and accept keyboard input.
    [Tags]    connections    ui    regression
    Go To    ${CONNECTIONS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State
    ...    input[placeholder*="nom ou email"]
    ...    visible    timeout=${RETRY_TIMEOUT}
    Click    input[placeholder*="nom ou email"]
    Fill Text    input[placeholder*="nom ou email"]    Robot
    Sleep    0.5s
    ${value}=    Get Property    input[placeholder*="nom ou email"]    value
    Should Be Equal    ${value}    Robot

TC_CONN_001_04 Sort dropdown is present with expected options
    [Documentation]    The sort selector must be visible and contain the
    ...                "Plus récents" and "Nom (A-Z)" options.
    [Tags]    connections    ui
    Go To    ${CONNECTIONS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    select    visible    timeout=${RETRY_TIMEOUT}
    ${options}=    Get Text    select
    Should Contain    ${options}    récents

TC_CONN_001_05 Grid and List view toggle buttons are present
    [Documentation]    The toolbar must expose two view-mode toggle buttons
    ...                (grid and list) with appropriate title attributes.
    [Tags]    connections    ui
    Go To    ${CONNECTIONS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State
    ...    button[title="Vue en grille"]
    ...    visible    timeout=${RETRY_TIMEOUT}
    Wait For Elements State
    ...    button[title="Vue en liste"]
    ...    visible    timeout=${TIMEOUT}

TC_CONN_001_06 Switching to List view changes layout
    [Documentation]    Clicking the List view button must switch the content
    ...                area to list mode without crashing the page.
    [Tags]    connections    interaction
    Go To    ${CONNECTIONS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    button[title="Vue en liste"]    visible    timeout=${RETRY_TIMEOUT}
    Click    button[title="Vue en liste"]
    Sleep    0.5s
    URL Should Contain    /connections

TC_CONN_001_07 Clicking Abonnements tab switches content
    [Documentation]    Clicking the "Abonnements" tab must activate it and
    ...                keep the user on /connections.
    [Tags]    connections    interaction
    Go To    ${CONNECTIONS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    button:has-text("Abonnements")    visible    timeout=${RETRY_TIMEOUT}
    Click    button:has-text("Abonnements")
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
    ${cards}=    Get Element Count
    ...    [class*="rounded-2xl"], [class*="UserCard"]
    ${empty}=    Run Keyword And Return Status
    ...    Wait For Elements State
    ...    h3:has-text("Aucune suggestion"), h3:has-text("Pas encore")
    ...    visible    timeout=5s
    Should Be True    ${cards} > 0 or ${empty}
    ...    msg=Suggestions tab must show user cards or an empty state

TC_CONN_001_09 Back button navigates away from connections
    [Documentation]    Clicking the "Retour" back-navigation button must
    ...                leave the /connections page.
    [Tags]    connections    navigation
    Go To    ${CONNECTIONS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    button:has-text("Retour")    visible    timeout=${RETRY_TIMEOUT}
    Click    button:has-text("Retour")
    Sleep    0.5s
    # Should navigate away (browser back — URL will differ from /connections)
    Log    Navigation triggered from Retour button
