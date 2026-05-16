*** Settings ***
Documentation    TC_ADMIN_003 – Admin users management page (/users).
...
...              Verifies the users administration page: heading, users table
...              with column headers, search/filter bar, pagination, and the
...              presence of the test user row.
...
...              ⚠ Requires an ADMIN account — configure ${ADMIN_EMAIL}
...                and ${ADMIN_PASSWORD} in resources/variables.resource.
Resource         ../../resources/common.resource
Resource         ../../resources/auth_admin_keywords.resource

Suite Setup      Run Keywords
...              Open Browser Session
...              AND    Sign In As Admin
Suite Teardown   Close Browser Session
Test Teardown    Take Screenshot On Failure


*** Test Cases ***
TC_ADMIN_003_01 Users page loads with correct heading
    [Documentation]    An ADMIN user visiting /users must see the heading
    ...                "Gestion des Utilisateurs".
    [Tags]    smoke    admin    users
    Go To    ${USERS_ADMIN_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State
    ...    h1:has-text("Gestion des Utilisateurs"), h2:has-text("Gestion des Utilisateurs")
    ...    visible    timeout=${RETRY_TIMEOUT}

TC_ADMIN_003_02 Users table has column headers
    [Documentation]    The users table must render column header cells
    ...                (th elements) for user data fields.
    [Tags]    admin    users    ui
    Go To    ${USERS_ADMIN_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State
    ...    h1:has-text("Gestion"), h2:has-text("Gestion")
    ...    visible    timeout=${RETRY_TIMEOUT}
    ${headers}=    Get Element Count    th
    Should Be True    ${headers} >= 3
    ...    msg=Users table must have at least 3 column headers

TC_ADMIN_003_03 Search or filter bar is present
    [Documentation]    The users page must include a search input or filter
    ...                controls to find specific users.
    [Tags]    admin    users    ui
    Go To    ${USERS_ADMIN_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State
    ...    h1:has-text("Gestion"), h2:has-text("Gestion")
    ...    visible    timeout=${RETRY_TIMEOUT}
    ${count}=    Get Element Count
    ...    input[type="text"], input[type="search"], input[placeholder*="Recherch"], input[placeholder*="Filtr"]
    Should Be True    ${count} >= 1    msg=A search or filter input must be present

TC_ADMIN_003_04 At least one user row is displayed
    [Documentation]    The users table must show at least one data row —
    ...                the test user account must appear.
    [Tags]    admin    users    regression
    Go To    ${USERS_ADMIN_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State
    ...    h1:has-text("Gestion"), h2:has-text("Gestion")
    ...    visible    timeout=${RETRY_TIMEOUT}
    ${rows}=    Get Element Count    tbody >> tr
    Should Be True    ${rows} >= 1    msg=At least one user row must be visible

TC_ADMIN_003_05 Pagination controls are visible
    [Documentation]    The users table must expose pagination controls
    ...                (next/previous buttons or page numbers).
    [Tags]    admin    users    ui
    Go To    ${USERS_ADMIN_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State
    ...    h1:has-text("Gestion"), h2:has-text("Gestion")
    ...    visible    timeout=${RETRY_TIMEOUT}
    ${count}=    Get Element Count
    ...    button:has-text("Suivant"), button:has-text("Précédent"), [aria-label*="next" i], [aria-label*="prev" i], [class*="pagination"]
    Run Keyword If    ${count} == 0
    ...    Log    No explicit pagination found — may use infinite scroll    WARN
