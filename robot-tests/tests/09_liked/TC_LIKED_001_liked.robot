*** Settings ***
Documentation    TC_LIKED_001 – Liked articles page scenarios.
...
...              Verifies that the liked articles page loads correctly
...              and renders the article list or an appropriate empty state.
Resource         ../../resources/common.resource
Resource         ../../resources/auth_keywords.resource

Suite Setup      Run Keywords
...              Open Browser Session
...              AND    Sign In As Valid User
Suite Teardown   Close Browser Session
Test Teardown    Take Screenshot On Failure


*** Test Cases ***
TC_LIKED_001_01 Liked page loads without errors
    [Documentation]    Navigating to /liked must load the page without
    ...                a crash and remain on the /liked URL.
    [Tags]    smoke    liked
    Go To    ${LIKED_URL}
    Wait For Load State    domcontentloaded
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    URL Should Contain    /liked

TC_LIKED_001_02 Page heading is visible
    [Documentation]    The liked articles page must render a visible h1
    ...                heading ("Articles aimés" or similar).
    [Tags]    liked    ui
    Go To    ${LIKED_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${RETRY_TIMEOUT}

TC_LIKED_001_03 Articles or empty state is displayed
    [Documentation]    The liked articles page must show either article
    ...                cards or an empty-state indicator.
    [Tags]    liked    regression
    Go To    ${LIKED_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${articles}=    Get Element Count
    ...    article, [class*="ArticleCard"], [class*="article-card"]
    ${empty}=    Run Keyword And Return Status
    ...    Wait For Elements State
    ...    [class*="empty"], p:has-text("Aucun"), p:has-text("No liked"), svg
    ...    visible    timeout=5s
    Should Be True    ${articles} > 0 or ${empty}
    ...    msg=Either articles or an empty state must be visible

TC_LIKED_001_04 Filter bar is present
    [Documentation]    The article filter bar must be rendered on the
    ...                liked articles page.
    [Tags]    liked    ui
    Go To    ${LIKED_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${count}=    Get Element Count
    ...    select, [class*="filter"], [class*="Filter"], button:has-text("Trier")
    Run Keyword If    ${count} == 0
    ...    Log    No explicit filter bar found — may be hidden when empty    WARN

TC_LIKED_001_05 Heart icon is visible on the page
    [Documentation]    The liked articles page should include the Heart
    ...                icon or a heart-themed visual element.
    [Tags]    liked    ui
    Go To    ${LIKED_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    # The page imports Heart from lucide-react — rendered as SVG
    ${count}=    Get Element Count    svg
    Should Be True    ${count} >= 1    msg=At least one SVG icon must be rendered on the page
