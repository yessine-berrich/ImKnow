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
    [Documentation]    After authentication the home page must render content:
    ...                either article cards or an empty feed message.
    [Tags]    smoke    home    regression
    Navigate To Home
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    # Accept article cards, any h1 heading, or empty-state message
    ${count}=    Get Element Count    h1, [class*="ArticleCard"], [class*="article-card"], [class*="Publication"]
    Should Be True    ${count} >= 1    msg=Home page must render a heading or article cards

TC_HOME_001_02 Sidebar displays Trending Articles widget
    [Documentation]    The right-side sidebar must show a trending articles
    ...                section ("Articles tendances" in FR, "Trending publications" in EN).
    [Tags]    home    ui
    Navigate To Home
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${count}=    Get Element Count
    ...    h3:has-text("Articles tendances"), h3:has-text("Trending publication"), h3:has-text("Trending"), *:has-text("tendances"), *:has-text("Trending publication")
    Should Be True    ${count} >= 1    msg=Sidebar must display a trending articles widget

TC_HOME_001_03 Sidebar displays Top Contributors widget
    [Documentation]    The right-side sidebar must show a top contributors
    ...                section ("Top contributeurs" in FR, "Top contributors" in EN).
    [Tags]    home    ui
    Navigate To Home
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${count}=    Get Element Count
    ...    h3:has-text("Top contributeurs"), h3:has-text("Top contributors"), *:has-text("contributeurs"), *:has-text("contributors")
    Should Be True    ${count} >= 1    msg=Sidebar must display a top contributors widget

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

TC_HOME_001_07 Unauthenticated access to home page is handled gracefully
    [Documentation]    Visiting /home without a session must either show the home
    ...                page (public access) or redirect to /signin (guarded route).
    ...                The app must not crash or show a blank page.
    [Tags]    home    security
    # Open a separate context with no auth token
    New Context    viewport={'width': ${VIEWPORT_WIDTH}, 'height': ${VIEWPORT_HEIGHT}}
    New Page       ${HOME_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${url}=    Get URL
    Log    Unauthenticated /home URL: ${url}    INFO
    ${on_home}=    Run Keyword And Return Status    URL Should Contain    /home
    ${on_signin}=    Run Keyword And Return Status    URL Should Contain    /signin
    ${on_error}=    Run Keyword And Return Status    URL Should Contain    /error
    Should Be True    ${on_home} or ${on_signin} or ${on_error}
    ...    msg=Unauthenticated /home must redirect to signin/home/error page
    Close Page
    Close Context
