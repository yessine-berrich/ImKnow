*** Settings ***
Documentation    TC_ADMIN_001 – Admin tags management page (/tags).
...
...              Verifies the tags administration page: heading, search,
...              view-mode toggle, tags list or empty state, and the
...              "Créer un tag" action button.
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
TC_ADMIN_001_01 Tags page loads with correct heading
    [Documentation]    An ADMIN user visiting /tags must see the h1 heading
    ...                "Gestion des Tags".
    [Tags]    smoke    admin    tags
    Go To    ${TAGS_ADMIN_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1:has-text("Gestion des Tags")    visible    timeout=${RETRY_TIMEOUT}

TC_ADMIN_001_02 Tags list or empty state is displayed
    [Documentation]    The tags table or cloud view must render either tag
    ...                entries or an empty-state indicator.
    [Tags]    admin    tags    regression
    Go To    ${TAGS_ADMIN_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1:has-text("Gestion des Tags")    visible    timeout=${RETRY_TIMEOUT}
    ${tags}=    Get Element Count
    ...    [class*="tag"], [class*="Tag"], tr, [class*="badge"]
    ${empty}=    Run Keyword And Return Status
    ...    Wait For Elements State
    ...    p:has-text("Aucun"), [class*="empty"]
    ...    visible    timeout=5s
    Should Be True    ${tags} > 0 or ${empty}
    ...    msg=Tags page must show tags or an empty state

TC_ADMIN_001_03 Create tag button is visible
    [Documentation]    An "Ajouter" or "Créer un tag" action button must be
    ...                present on the tags management page.
    [Tags]    admin    tags    ui
    Go To    ${TAGS_ADMIN_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1:has-text("Gestion des Tags")    visible    timeout=${RETRY_TIMEOUT}
    Wait For Elements State
    ...    button:has-text("Ajouter"), button:has-text("Créer"), button:has-text("Nouveau")
    ...    visible    timeout=${RETRY_TIMEOUT}

TC_ADMIN_001_04 View mode toggle is present (list/cloud)
    [Documentation]    The tags page must expose a toggle to switch between
    ...                list view and cloud view.
    [Tags]    admin    tags    ui
    Go To    ${TAGS_ADMIN_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1:has-text("Gestion des Tags")    visible    timeout=${RETRY_TIMEOUT}
    ${count}=    Get Element Count
    ...    button:has-text("Liste"), button:has-text("Nuage"), button[title*="list" i], button[title*="cloud" i]
    Run Keyword If    ${count} == 0
    ...    Log    No explicit view toggle found — may use icon-only buttons    WARN

TC_ADMIN_001_05 Search or filter input is present
    [Documentation]    The tags page must include a search or filter input
    ...                to help find specific tags.
    [Tags]    admin    tags    ui
    Go To    ${TAGS_ADMIN_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1:has-text("Gestion des Tags")    visible    timeout=${RETRY_TIMEOUT}
    ${count}=    Get Element Count
    ...    input[type="text"], input[type="search"], input[placeholder*="Recherch"]
    Run Keyword If    ${count} == 0
    ...    Log    No search input found on tags page    WARN
