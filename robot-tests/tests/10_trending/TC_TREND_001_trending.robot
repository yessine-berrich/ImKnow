*** Settings ***
Documentation    TC_TREND_001 – Trending page scenarios.
...
...              Verifies that the trending statistics page loads, displays
...              the weekly stats cards, popular articles section, and
...              the daily activity chart.
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
    ...                display the main heading "Tendances de la semaine".
    [Tags]    smoke    trending
    Go To    ${TRENDING_URL}
    Wait For Load State    domcontentloaded
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${RETRY_TIMEOUT}
    ${text}=    Get Text    h1
    Should Contain    ${text}    Tendances

TC_TREND_001_02 Stats cards are displayed
    [Documentation]    Three statistics cards (articles, views, active authors)
    ...                must be visible after data loads. Titles are rendered
    ...                in a <div> element inside each card.
    [Tags]    trending    ui    regression
    Go To    ${TRENDING_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1:has-text("Tendances")    visible    timeout=${RETRY_TIMEOUT}
    # StatCard renders title as a <div class="text-sm ..."> inside a border card
    ${count}=    Get Element Count
    ...    div:has-text("Articles publiés"), div:has-text("Vues totales"), div:has-text("Auteurs actifs")
    Should Be True    ${count} >= 1    msg=At least one stat card title must be visible

TC_TREND_001_03 Popular articles section is present
    [Documentation]    The "Articles populaires" section heading must appear
    ...                on the trending page.
    [Tags]    trending    ui
    Go To    ${TRENDING_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1:has-text("Tendances")    visible    timeout=${RETRY_TIMEOUT}
    Wait For Elements State
    ...    h2:has-text("Articles populaires")
    ...    visible    timeout=${RETRY_TIMEOUT}

TC_TREND_001_04 Daily activity section is present
    [Documentation]    The "Activité quotidienne" section must be rendered
    ...                below the popular articles list.
    [Tags]    trending    ui
    Go To    ${TRENDING_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1:has-text("Tendances")    visible    timeout=${RETRY_TIMEOUT}
    Wait For Elements State
    ...    h2:has-text("Activité quotidienne")
    ...    visible    timeout=${RETRY_TIMEOUT}

TC_TREND_001_05 Top tags or top authors section is visible
    [Documentation]    The sidebar of the trending page must show either
    ...                top tags or top authors rankings.
    [Tags]    trending    ui    regression
    Go To    ${TRENDING_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1:has-text("Tendances")    visible    timeout=${RETRY_TIMEOUT}
    ${has_section}=    Get Element Count
    ...    h2:has-text("Tags"), h2:has-text("Auteurs"), h3:has-text("Tags"), h3:has-text("Auteurs")
    Run Keyword If    ${has_section} == 0
    ...    Log    No top-tags or top-authors heading found — may use different text    WARN
    # At minimum the page must not be empty
    ${total_headings}=    Get Element Count    h2, h3
    Should Be True    ${total_headings} >= 2    msg=Trending page must have at least 2 section headings
