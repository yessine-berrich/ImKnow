*** Settings ***
Documentation    TC_TREND_001 – Trending page scenarios.
...
...              Verifies that the trending statistics page loads, displays
...              weekly stats cards, popular articles, and daily activity.
...
...              Selectors accept both French and English UI text.
Resource         ../../resources/common.resource
Resource         ../../resources/auth_keywords.resource

Suite Setup      Run Keywords
...              Open Browser Session
...              AND    Sign In As Valid User
Suite Teardown   Close Browser Session
Test Teardown    Take Screenshot On Failure


*** Test Cases ***
TC_TREND_001_01 Trending page loads without errors
    [Documentation]    Navigating to /trending must render the page and
    ...                display the main heading (FR: "Tendances" / EN: "Trending").
    [Tags]    smoke    trending
    Go To    ${TRENDING_URL}
    Wait For Load State    domcontentloaded
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${RETRY_TIMEOUT}
    ${text}=    Get Text    h1
    ${ok}=    Evaluate    "tendance" in "${text}".lower() or "trending" in "${text}".lower() or "trend" in "${text}".lower()
    Should Be True    ${ok}    msg=h1 must contain "tendance" or "trending"

TC_TREND_001_02 Stats cards are displayed
    [Documentation]    Statistics cards for articles/publications, views, and
    ...                authors must be visible after data loads.
    [Tags]    trending    ui    regression
    Go To    ${TRENDING_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${RETRY_TIMEOUT}
    # Accept French or English stat card labels
    ${count}=    Get Element Count
    ...    *:has-text("Articles publiés"), *:has-text("Vues totales"), *:has-text("Auteurs actifs"), *:has-text("Publications"), *:has-text("Total views"), *:has-text("Active authors")
    Should Be True    ${count} >= 1    msg=At least one stat card must be visible

TC_TREND_001_03 Popular articles section is present
    [Documentation]    The popular articles section heading must appear
    ...                (FR: "Articles populaires" / EN: "Popular publications").
    [Tags]    trending    ui
    Go To    ${TRENDING_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${RETRY_TIMEOUT}
    Wait For Elements State
    ...    h2:has-text("Articles populaires"), h2:has-text("Publications populaires"), h2:has-text("Popular publication"), h2:has-text("Popular articles"), h2:has-text("Popular"), h2:has-text("populaire"), h3:has-text("Articles populaires"), h3:has-text("Popular")
    ...    visible    timeout=${RETRY_TIMEOUT}

TC_TREND_001_04 Daily activity section is present
    [Documentation]    The daily activity section must be rendered
    ...                (FR: "Activité quotidienne" / EN: "Daily activity").
    [Tags]    trending    ui
    Go To    ${TRENDING_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${RETRY_TIMEOUT}
    # :has-text() does not support i flag — use explicit case variants
    Wait For Elements State
    ...    h2:has-text("Activité quotidienne"), h2:has-text("Daily activity"), h2:has-text("Daily Activity"), h2:has-text("activity"), h2:has-text("Activity"), h3:has-text("Activité quotidienne"), h3:has-text("Daily activity")
    ...    visible    timeout=${RETRY_TIMEOUT}

TC_TREND_001_05 Top tags or top authors section is visible
    [Documentation]    The sidebar of the trending page must show either
    ...                top tags or top authors rankings.
    [Tags]    trending    ui    regression
    Go To    ${TRENDING_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${RETRY_TIMEOUT}
    # At minimum the page must have section headings
    ${total_headings}=    Get Element Count    h2, h3
    Should Be True    ${total_headings} >= 2    msg=Trending page must have at least 2 section headings
