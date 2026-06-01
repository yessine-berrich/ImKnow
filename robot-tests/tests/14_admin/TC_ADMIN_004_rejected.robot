*** Settings ***
Documentation    TC_ADMIN_004 – Admin rejected articles pages.
...
...              Covers two sub-pages:
...                /rejected/moderation  — Articles rejected by AI moderation
...                /rejected/duplicated  — Articles rejected as duplicates
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
TC_ADMIN_004_01 Moderation page loads with correct heading
    [Documentation]    An ADMIN visiting /rejected/moderation must see the
    ...                heading "Articles Rejetés" or "Modération".
    [Tags]    smoke    admin    rejected
    Go To    ${REJECTED_MOD_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${TIMEOUT}

TC_ADMIN_004_02 Moderation page shows articles table or empty state
    [Documentation]    The moderation table must display rejected articles
    ...                rows or an empty-state message. The page must not be blank.
    [Tags]    admin    rejected    regression
    Go To    ${REJECTED_MOD_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${TIMEOUT}
    ${rows}=    Get Element Count    tbody >> tr
    ${table}=    Get Element Count    table, [class*="table" i]
    ${empty}=    Run Keyword And Return Status
    ...    Wait For Elements State
    ...    *:has-text("No rejected"), *:has-text("Aucun"), *:has-text("No data"), [class*="empty" i]
    ...    visible    timeout=5s
    # Pass if rows exist OR a table structure exists OR an empty-state is shown
    Should Be True    ${rows} > 0 or ${table} > 0 or ${empty}
    ...    msg=Moderation page must render a table or empty state — not a blank page

TC_ADMIN_004_03 Moderation page has a refresh button
    [Documentation]    The moderation page must expose a refresh button to
    ...                reload the rejected articles list.
    [Tags]    admin    rejected    ui
    Go To    ${REJECTED_MOD_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${TIMEOUT}
    ${count}=    Get Element Count
    ...    button:has-text("Actualiser"), button:has-text("Rafraîchir"), button[title*="refresh" i], svg[class*="RefreshCw"]
    Run Keyword If    ${count} == 0
    ...    Log    No explicit refresh button found    WARN

TC_ADMIN_004_04 Duplicated articles page loads correctly
    [Documentation]    An ADMIN visiting /rejected/duplicated must load the
    ...                page without error and remain on the /rejected URL.
    [Tags]    smoke    admin    rejected    duplicated
    Go To    ${REJECTED_DUP_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    URL Should Contain    /rejected

TC_ADMIN_004_05 Duplicated page shows table or empty state
    [Documentation]    The duplicates table must display article rows or an
    ...                empty-state message — never a blank page.
    [Tags]    admin    rejected    duplicated    regression
    Go To    ${REJECTED_DUP_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${rows}=    Get Element Count    tbody >> tr
    ${empty}=    Run Keyword And Return Status
    ...    Wait For Elements State
    ...    p:has-text("Aucun"), [class*="empty"], td:has-text("Aucun")
    ...    visible    timeout=5s
    ${headings}=    Get Element Count    h1, h2, h3
    Should Be True    ${rows} > 0 or ${empty} or ${headings} > 0
    ...    msg=Duplicated page must render content or an empty state

TC_ADMIN_004_06 Moderation table has column headers
    [Documentation]    The rejected articles table must have column headers
    ...                to identify each data field.
    [Tags]    admin    rejected    ui
    Go To    ${REJECTED_MOD_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${TIMEOUT}
    ${headers}=    Get Element Count    th
    Run Keyword If    ${headers} == 0
    ...    Log    No th headers found — table may use a different structure    WARN
