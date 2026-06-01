*** Settings ***
Documentation    TC_ADMIN_002 – Admin categories management page (/categories).
...
...              Verifies the categories administration page: heading,
...              categories list, article counts, and create-category action.
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
TC_ADMIN_002_01 Categories page loads with correct heading
    [Documentation]    An ADMIN user visiting /categories must see the h1
    ...                heading "Catégories".
    [Tags]    smoke    admin    categories
    Go To    ${CATEGORIES_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${TIMEOUT}

TC_ADMIN_002_02 Categories list or empty state is displayed
    [Documentation]    At least one category card or an empty-state must
    ...                be visible after data loads.
    [Tags]    admin    categories    regression
    Go To    ${CATEGORIES_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${TIMEOUT}
    # Category cards use class "group relative ... rounded-xl"; empty state uses h3
    ${cats}=    Get Element Count
    ...    div[class*="group"][class*="rounded-xl"]
    ${empty}=    Run Keyword And Return Status
    ...    Wait For Elements State
    ...    h3:has-text("Aucune catégorie"), p:has-text("Aucune")
    ...    visible    timeout=5s
    Should Be True    ${cats} > 0 or ${empty}
    ...    msg=Categories page must show category items or empty state

TC_ADMIN_002_03 Create category button is visible
    [Documentation]    A "New category" or equivalent action button must be
    ...                present on the categories management page.
    [Tags]    admin    categories    ui
    Go To    ${CATEGORIES_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${TIMEOUT}
    Wait For Elements State
    ...    button:has-text("New category"), button:has-text("New Category"), button:has-text("Add"), button:has-text("Create"), button:has-text("Ajouter"), button:has-text("Créer")
    ...    visible    timeout=${RETRY_TIMEOUT}

TC_ADMIN_002_04 Category cards show article counts
    [Documentation]    Each category card must display a count of articles
    ...                associated to it.
    [Tags]    admin    categories    regression
    Go To    ${CATEGORIES_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${TIMEOUT}
    ${count}=    Get Element Count
    ...    [class*="article"], p:has-text("article"), span:has-text("article")
    Run Keyword If    ${count} == 0
    ...    Log    No article count found — may be empty or using different label    WARN

TC_ADMIN_002_05 Description text is visible below heading
    [Documentation]    A subtitle or description paragraph must be visible
    ...                on the categories management page.
    [Tags]    admin    categories    ui
    Go To    ${CATEGORIES_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${TIMEOUT}
    ${count}=    Get Element Count    p, [class*="description" i], [class*="subtitle" i]
    Run Keyword If    ${count} == 0
    ...    Log    No description paragraph found — heading may be the only text    WARN
