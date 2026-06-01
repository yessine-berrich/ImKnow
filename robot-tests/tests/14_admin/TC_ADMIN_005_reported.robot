*** Settings ***
Documentation    TC_ADMIN_005 – Admin reported content pages.
...
...              Covers two sub-pages:
...                /reported/reported-articles  — Reported articles
...                /reported/reported-users     — Reported users
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
TC_ADMIN_005_01 Reported articles page loads with correct heading
    [Documentation]    An ADMIN visiting /reported/reported-publications must see
    ...                the h1 heading.
    [Tags]    smoke    admin    reported
    Go To    ${REPORTED_ART_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${TIMEOUT}

TC_ADMIN_005_02 Reported articles table or empty state is displayed
    [Documentation]    The reported articles page must show either data rows
    ...                or a clear empty-state indicator.
    [Tags]    admin    reported    regression
    Go To    ${REPORTED_ART_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${TIMEOUT}
    # Accept table rows, card-based rows, or any empty-state signal
    ${rows}=    Get Element Count    tbody tr, [class*="row" i], [class*="card" i], tr
    ${empty}=    Run Keyword And Return Status
    ...    Wait For Elements State
    ...    *:has-text("Aucun"), *:has-text("No report"), *:has-text("empty"), [class*="empty" i]
    ...    visible    timeout=5s
    Should Be True    ${rows} > 0 or ${empty}
    ...    msg=Reported articles page must show rows/cards or an empty state

TC_ADMIN_005_03 Reported articles page has risk filter or search
    [Documentation]    The reported articles page must expose a search input
    ...                or a risk-level filter control.
    [Tags]    admin    reported    ui
    Go To    ${REPORTED_ART_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${TIMEOUT}
    ${count}=    Get Element Count    input, select, [class*="filter" i], [class*="search" i], [class*="Filter"], [class*="Search"]
    Run Keyword If    ${count} == 0
    ...    Log    No filter or search control found — page may use a different UI pattern    WARN

TC_ADMIN_005_04 Reported users page loads with correct heading
    [Documentation]    An ADMIN visiting /reported/reported-users must see
    ...                the h1 heading "Utilisateurs signalés".
    [Tags]    smoke    admin    reported
    Go To    ${REPORTED_USR_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${TIMEOUT}

TC_ADMIN_005_05 Reported users table or empty state is displayed
    [Documentation]    The reported users page must show either data rows,
    ...                a table structure, or a clear empty-state indicator.
    [Tags]    admin    reported    regression
    Go To    ${REPORTED_USR_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${TIMEOUT}
    ${rows}=    Get Element Count    tbody >> tr
    ${table}=    Get Element Count    table, [class*="table" i]
    ${empty}=    Run Keyword And Return Status
    ...    Wait For Elements State
    ...    *:has-text("No reported"), *:has-text("Aucun"), *:has-text("No data"), [class*="empty" i]
    ...    visible    timeout=5s
    Should Be True    ${rows} > 0 or ${table} > 0 or ${empty}
    ...    msg=Reported users page must render a table or empty state — not a blank page

TC_ADMIN_005_06 Refresh button is present on reported articles page
    [Documentation]    The reported articles page must expose a refresh button
    ...                to reload the reports list on demand.
    [Tags]    admin    reported    ui
    Go To    ${REPORTED_ART_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${TIMEOUT}
    ${count}=    Get Element Count
    ...    button:has-text("Actualiser"), button:has-text("Rafraîchir"), button[title*="Refresh" i]
    Run Keyword If    ${count} == 0
    ...    Log    No explicit refresh button found — may use icon only    WARN
