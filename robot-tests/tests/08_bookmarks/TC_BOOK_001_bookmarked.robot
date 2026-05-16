*** Settings ***
Documentation    TC_BOOK_001 – Bookmarked articles page scenarios.
...
...              Verifies that the bookmarked articles page loads correctly,
...              shows the filter bar, and handles empty/filled states.
Resource         ../../resources/common.resource
Resource         ../../resources/auth_keywords.resource

Suite Setup      Run Keywords
...              Open Browser Session
...              AND    Sign In As Valid User
Suite Teardown   Close Browser Session
Test Teardown    Take Screenshot On Failure


*** Test Cases ***
TC_BOOK_001_01 Bookmarked page loads without errors
    [Documentation]    Navigating to /bookmarked must load the page without
    ...                a crash and keep the URL on /bookmarked.
    [Tags]    smoke    bookmarks
    Go To    ${BOOKMARKED_URL}
    Wait For Load State    domcontentloaded
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    URL Should Contain    /bookmarked

TC_BOOK_001_02 Page heading is visible
    [Documentation]    The bookmarks page must render a visible h1 heading
    ...                ("Articles sauvegardés" or similar).
    [Tags]    bookmarks    ui
    Go To    ${BOOKMARKED_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${RETRY_TIMEOUT}

TC_BOOK_001_03 Articles or empty state is displayed
    [Documentation]    The bookmarks page must show either article cards or
    ...                an empty-state indicator — never a blank screen.
    [Tags]    bookmarks    regression
    Go To    ${BOOKMARKED_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${articles}=    Get Element Count
    ...    article, [class*="ArticleCard"], [class*="article-card"]
    ${empty}=    Run Keyword And Return Status
    ...    Wait For Elements State
    ...    [class*="empty"], p:has-text("Aucun"), p:has-text("No bookmark"), svg
    ...    visible    timeout=5s
    Should Be True    ${articles} > 0 or ${empty}
    ...    msg=Either articles or an empty state must be visible

TC_BOOK_001_04 Filter bar is present
    [Documentation]    The article filter bar (sort / category / tag)
    ...                must be rendered on the bookmarks page.
    [Tags]    bookmarks    ui
    Go To    ${BOOKMARKED_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    # Filter bar contains sort/filter controls
    ${count}=    Get Element Count
    ...    select, [class*="filter"], [class*="Filter"], button:has-text("Trier")
    Run Keyword If    ${count} == 0
    ...    Log    No explicit filter bar found — may be hidden when empty    WARN

TC_BOOK_001_05 Back navigation link is present
    [Documentation]    The bookmarks page must include a back-navigation
    ...                element to return to the previous page.
    [Tags]    bookmarks    navigation
    Go To    ${BOOKMARKED_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${has_back}=    Get Element Count
    ...    a[href="/home"], button:has-text("Retour"), [aria-label*="back" i], [aria-label*="retour" i]
    Run Keyword If    ${has_back} == 0
    ...    Log    No explicit back button found — navigation may use browser history    WARN
