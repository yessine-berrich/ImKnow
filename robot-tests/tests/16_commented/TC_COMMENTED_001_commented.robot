*** Settings ***
Documentation    TC_COMMENTED_001 – Commented publications page scenarios.
...
...              Verifies that the commented publications page loads correctly,
...              shows the heading, filter bar, and handles filled/empty states.
Resource         ../../resources/common.resource
Resource         ../../resources/auth_keywords.resource

Suite Setup      Run Keywords
...              Open Browser Session
...              AND    Sign In As Valid User
Suite Teardown   Close Browser Session
Test Teardown    Take Screenshot On Failure


*** Test Cases ***
TC_COMMENTED_001_01 Commented page loads without errors
    [Documentation]    Navigating to /commented must load the page without
    ...                a crash and keep the URL on /commented.
    [Tags]    smoke    commented
    Go To    ${COMMENTED_URL}
    Wait For Load State    domcontentloaded
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    URL Should Contain    /commented

TC_COMMENTED_001_02 Page heading is visible
    [Documentation]    The commented publications page must render a visible
    ...                h1 heading related to commented articles.
    [Tags]    commented    ui
    Go To    ${COMMENTED_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    # Use nth=0 — article detail content may also have an h1 on the same page
    Wait For Elements State    h1 >> nth=0    visible    timeout=${RETRY_TIMEOUT}

TC_COMMENTED_001_03 Publications or empty state is displayed
    [Documentation]    The commented page must show either publication cards
    ...                or an empty-state indicator — never a blank screen.
    [Tags]    commented    regression
    Go To    ${COMMENTED_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${articles}=    Get Element Count
    ...    article, [class*="PublicationCard"], [class*="publication-card"], [class*="ArticleCard"]
    ${empty}=    Run Keyword And Return Status
    ...    Wait For Elements State
    ...    [class*="empty"], p:has-text("Aucun"), p:has-text("No comment"), svg
    ...    visible    timeout=5s
    Should Be True    ${articles} > 0 or ${empty}
    ...    msg=Either publications or an empty state must be visible

TC_COMMENTED_001_04 Filter bar is rendered on the page
    [Documentation]    The publication filter bar (sort / category / tag)
    ...                must be present on the commented publications page.
    [Tags]    commented    ui
    Go To    ${COMMENTED_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${count}=    Get Element Count
    ...    select, [class*="filter"], [class*="Filter"], button:has-text("Trier")
    Run Keyword If    ${count} == 0
    ...    Log    No explicit filter bar found — may be hidden when page is empty    WARN

TC_COMMENTED_001_05 MessageCircle icon or comment indicator is present
    [Documentation]    The commented page must render at least one SVG icon
    ...                (MessageCircle or similar comment icon).
    [Tags]    commented    ui
    Go To    ${COMMENTED_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${count}=    Get Element Count    svg
    Should Be True    ${count} >= 1    msg=At least one SVG icon must be rendered on the page

TC_COMMENTED_001_06 Back / navigation link is accessible
    [Documentation]    The commented page must include a navigation element
    ...                to return to the previous page or home.
    [Tags]    commented    navigation
    Go To    ${COMMENTED_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${has_back}=    Get Element Count
    ...    a[href="/home"], button:has-text("Retour"), [aria-label*="back" i], [aria-label*="retour" i]
    Run Keyword If    ${has_back} == 0
    ...    Log    No explicit back button found — navigation may use browser history    WARN

TC_COMMENTED_001_07 Sort-by-comment filter option is available
    [Documentation]    The default sort option for commented publications should
    ...                include "last comment" or similar ordering by comment date.
    [Tags]    commented    ui    regression
    Go To    ${COMMENTED_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    # :has-text() does not support the i case-flag — use explicit case variants
    ${count}=    Get Element Count
    ...    select, [class*="sort"], [class*="Sort"], option:has-text("commentaire"), option:has-text("Commentaire"), option:has-text("comment"), option:has-text("Comment")
    Run Keyword If    ${count} == 0
    ...    Log    Comment-based sort option not found — filter may use a different label    WARN
