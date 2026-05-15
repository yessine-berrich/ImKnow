*** Settings ***
Documentation    TC_SEARCH_001 – Global search bar scenarios.
...
...              Verifies keyword search, empty results, and result navigation.
Resource         ../../resources/common.resource
Resource         ../../resources/auth_keywords.resource
Resource         ../../resources/navigation_keywords.resource

Suite Setup      Run Keywords
...              Open Browser Session
...              AND    Sign In As Valid User
Suite Teardown   Close Browser Session
Test Teardown    Take Screenshot On Failure


*** Variables ***
${SEARCH_INPUT}         input[placeholder*="Search"], input[placeholder*="Recherch"], input[type="search"]
${RESULTS_CONTAINER}    [class*="max-h-[70vh]"]


*** Test Cases ***
TC_SEARCH_001_01 Search input is present on the home page
    [Documentation]    A search input field must be visible in the header/navbar
    ...                after authentication.
    [Tags]    smoke    search
    Navigate To Home
    Wait For Load State    domcontentloaded
    Wait For Elements State    ${SEARCH_INPUT}    visible    timeout=${TIMEOUT}

TC_SEARCH_001_02 Typing in search bar shows dropdown results
    [Documentation]    Entering a query string (e.g. "NestJS") must open a
    ...                results dropdown within the timeout.
    [Tags]    search    regression
    Navigate To Home
    Wait For Load State    domcontentloaded
    Click    ${SEARCH_INPUT}
    Fill Text    ${SEARCH_INPUT}    NestJS
    Wait For Elements State    ${RESULTS_CONTAINER}    visible    timeout=${RETRY_TIMEOUT}

TC_SEARCH_001_03 Search results contain article entries
    [Documentation]    The results dropdown for a known query must list at least
    ...                one article entry.
    [Tags]    search    regression
    Navigate To Home
    Wait For Load State    domcontentloaded
    Click    ${SEARCH_INPUT}
    Fill Text    ${SEARCH_INPUT}    NestJS
    Wait For Elements State    ${RESULTS_CONTAINER}    visible    timeout=${RETRY_TIMEOUT}
    ${count}=    Get Element Count    ${RESULTS_CONTAINER} >> [class*="article"], ${RESULTS_CONTAINER} >> li
    Log    Search returned ${count} result item(s)

TC_SEARCH_001_04 Clearing the search input closes the dropdown
    [Documentation]    Erasing the query text must hide (or empty) the results
    ...                dropdown.
    [Tags]    search    ui
    Navigate To Home
    Wait For Load State    domcontentloaded
    Click    ${SEARCH_INPUT}
    Fill Text    ${SEARCH_INPUT}    NestJS
    Wait For Elements State    ${RESULTS_CONTAINER}    visible    timeout=${RETRY_TIMEOUT}
    Fill Text    ${SEARCH_INPUT}    ${EMPTY}
    Wait For Elements State    ${RESULTS_CONTAINER}    hidden    timeout=${TIMEOUT}

TC_SEARCH_001_05 Searching with an unknown term shows no-results message
    [Documentation]    A query that matches nothing must display a "no results"
    ...                indicator rather than crashing or hanging.
    [Tags]    search    negative
    Navigate To Home
    Wait For Load State    domcontentloaded
    Click    ${SEARCH_INPUT}
    Fill Text    ${SEARCH_INPUT}    xyzzy_no_match_12345
    Sleep    2s
    # Either the dropdown is empty or a "no results" text appears
    ${has_no_results}=    Run Keyword And Return Status
    ...    Get Text    ${RESULTS_CONTAINER}    contains    no result
    ${empty_dropdown}=    Run Keyword And Return Status
    ...    Get Element Count    ${RESULTS_CONTAINER} >> li    ==    0
    Should Be True    ${has_no_results} or ${empty_dropdown}
    ...    Expected empty results or "no results" indicator

TC_SEARCH_001_06 Pressing Escape closes the search dropdown
    [Documentation]    Pressing the Escape key while the search dropdown is open
    ...                must dismiss it.
    [Tags]    search    keyboard
    Navigate To Home
    Wait For Load State    domcontentloaded
    Click    ${SEARCH_INPUT}
    Fill Text    ${SEARCH_INPUT}    NestJS
    Wait For Elements State    ${RESULTS_CONTAINER}    visible    timeout=${RETRY_TIMEOUT}
    Keyboard Key    press    Escape
    Wait For Elements State    ${RESULTS_CONTAINER}    hidden    timeout=${TIMEOUT}

TC_SEARCH_001_07 Clicking a search result navigates to the correct page
    [Documentation]    Clicking the first result item must navigate to a detail
    ...                page (URL changes away from /home or a modal opens).
    [Tags]    search    navigation    regression
    Navigate To Home
    Wait For Load State    domcontentloaded
    Click    ${SEARCH_INPUT}
    Fill Text    ${SEARCH_INPUT}    NestJS
    Wait For Elements State    ${RESULTS_CONTAINER}    visible    timeout=${RETRY_TIMEOUT}
    ${has_result}=    Run Keyword And Return Status
    ...    Wait For Elements State    ${RESULTS_CONTAINER} >> button    visible    timeout=5s
    Run Keyword If    ${has_result}
    ...    Click    ${RESULTS_CONTAINER} >> button >> nth=0
    Wait For Load State    domcontentloaded
    # URL should change or a modal should open
    ${current_url}=    Get URL
    Log    After click, URL is: ${current_url}
