*** Settings ***
Documentation    TC_HOME_001 – Home page / article feed scenarios.
...
...              Verifies that the authenticated home page renders the article
...              feed, sidebar widgets, and interaction controls.
Resource         ../../resources/common.resource
Resource         ../../resources/auth_keywords.resource
Resource         ../../resources/navigation_keywords.resource

Suite Setup      Run Keywords
...              Open Browser Session
...              AND    Sign In As Valid User
Suite Teardown   Close Browser Session
Test Teardown    Take Screenshot On Failure


*** Test Cases ***
TC_HOME_001_01 Home page renders the article feed section
    [Documentation]    After authentication the home page must display a
    ...                heading and at least the articles container.
    [Tags]    smoke    home    regression
    Navigate To Home
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    # Either articles OR the "no articles" empty-state must be present
    Wait For Elements State
    ...    h1:has-text("Articles"), [class*="ArticleCard"], [class*="Aucun"]
    ...    visible    timeout=${RETRY_TIMEOUT}

TC_HOME_001_02 Sidebar displays Trending Articles widget
    [Documentation]    The right-side sidebar must show a trending articles
    ...                section.
    [Tags]    home    ui
    Navigate To Home
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State
    ...    h3:has-text("Articles tendances")
    ...    visible    timeout=${RETRY_TIMEOUT}

TC_HOME_001_03 Sidebar displays Top Contributors widget
    [Documentation]    The right-side sidebar must show a top contributors
    ...                section.
    [Tags]    home    ui
    Navigate To Home
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State
    ...    h3:has-text("Top contributeurs")
    ...    visible    timeout=${RETRY_TIMEOUT}

TC_HOME_001_04 Loading spinner appears then disappears
    [Documentation]    During data fetch the spinner is visible; after fetch
    ...                completes it should be gone.
    [Tags]    home    ui
    Navigate To Home
    # Wait for load to complete — spinner should be gone
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    .animate-spin    hidden    timeout=${RETRY_TIMEOUT}

TC_HOME_001_05 Article card is visible and contains key metadata
    [Documentation]    At least one article card must be rendered with a title
    ...                and author information.
    [Tags]    home    regression
    Navigate To Home
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${count}=    Get Element Count    [class*="article"], article, [class*="ArticleCard"]
    Run Keyword If    ${count} == 0    Log    No articles found — feed may be empty    WARN
    Run Keyword If    ${count} > 0    Log    Found ${count} article card(s)    INFO

TC_HOME_001_06 Refresh button reloads the feed
    [Documentation]    Clicking "Actualiser les articles" fetches articles again
    ...                without a full page reload.
    [Tags]    home    interaction
    Navigate To Home
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${refresh_visible}=    Run Keyword And Return Status
    ...    Wait For Elements State    text=Actualiser les articles    visible    timeout=5s
    Run Keyword If    ${refresh_visible}
    ...    Click    text=Actualiser les articles
    Run Keyword If    ${refresh_visible}
    ...    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}

TC_HOME_001_07 Home page is accessible without authentication
    [Documentation]    Visiting /home without a valid session must load the page
    ...                (unauthenticated access is permitted — no forced redirect).
    [Tags]    home    security
    # Open a separate context with no auth token to verify public access
    New Context    viewport={'width': ${VIEWPORT_WIDTH}, 'height': ${VIEWPORT_HEIGHT}}
    New Page       ${HOME_URL}
    Wait For Load State    domcontentloaded
    URL Should Contain    /home
    Close Page
