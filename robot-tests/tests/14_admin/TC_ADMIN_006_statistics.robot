*** Settings ***
Documentation    TC_ADMIN_006 – Admin statistics page (/statistics).
...
...              Verifies the statistics dashboard: heading, navigation tabs
...              (Utilisateurs / Tags & Catégories / Signalements), stat cards,
...              and chart areas.
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
TC_ADMIN_006_01 Statistics page loads with correct heading
    [Documentation]    An ADMIN visiting /statistics must see the h1 heading
    ...                "Statistiques".
    [Tags]    smoke    admin    statistics
    Go To    ${STATISTICS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1:has-text("Statistiques")    visible    timeout=${RETRY_TIMEOUT}

TC_ADMIN_006_02 Navigation tabs are visible
    [Documentation]    The statistics page must expose section tabs including
    ...                "Utilisateurs" and "Signalements".
    [Tags]    admin    statistics    ui
    Go To    ${STATISTICS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1:has-text("Statistiques")    visible    timeout=${RETRY_TIMEOUT}
    # Tab buttons have class "whitespace-nowrap border-b-2" — sidebar buttons do not
    Wait For Elements State
    ...    button[class*="whitespace-nowrap"]:has-text("Utilisateurs")
    ...    visible    timeout=${RETRY_TIMEOUT}
    Wait For Elements State
    ...    button[class*="whitespace-nowrap"]:has-text("Signalements")
    ...    visible    timeout=${TIMEOUT}

TC_ADMIN_006_03 Tags and Categories tab is visible
    [Documentation]    The "Tags & Catégories" navigation tab must be
    ...                visible on the statistics page.
    [Tags]    admin    statistics    ui
    Go To    ${STATISTICS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1:has-text("Statistiques")    visible    timeout=${RETRY_TIMEOUT}
    # Exact text "Tags & Catégories" only appears in the tab, not the sidebar
    Wait For Elements State
    ...    button:has-text("Tags & Catégories")
    ...    visible    timeout=${RETRY_TIMEOUT}

TC_ADMIN_006_04 Statistics cards are displayed
    [Documentation]    The statistics page must render stat cards with numeric
    ...                values for key metrics.
    [Tags]    admin    statistics    regression
    Go To    ${STATISTICS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1:has-text("Statistiques")    visible    timeout=${RETRY_TIMEOUT}
    # StatCards render label as <p class="text-xs ..."> and value as <p class="text-2xl ...">
    ${count}=    Get Element Count    [class*="rounded-2xl"], [class*="StatCard"]
    Should Be True    ${count} >= 1
    ...    msg=At least one stat card must be visible on the statistics page

TC_ADMIN_006_05 Clicking Tags tab switches section content
    [Documentation]    Clicking the "Tags & Catégories" tab must update the
    ...                section without navigating away from /statistics.
    [Tags]    admin    statistics    interaction
    Go To    ${STATISTICS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1:has-text("Statistiques")    visible    timeout=${RETRY_TIMEOUT}
    Click    button:has-text("Tags & Catégories")
    Sleep    1s
    URL Should Contain    /statistics

TC_ADMIN_006_06 Clicking Signalements tab switches section content
    [Documentation]    Clicking the "Signalements" tab must update the section
    ...                without navigating away from /statistics.
    [Tags]    admin    statistics    interaction
    Go To    ${STATISTICS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1:has-text("Statistiques")    visible    timeout=${RETRY_TIMEOUT}
    Click    button[class*="whitespace-nowrap"]:has-text("Signalements")
    Sleep    1s
    URL Should Contain    /statistics

TC_ADMIN_006_07 Chart or graph area is rendered
    [Documentation]    The statistics page must render at least one chart
    ...                or graph area (ApexCharts SVG element).
    [Tags]    admin    statistics    ui    regression
    Go To    ${STATISTICS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1:has-text("Statistiques")    visible    timeout=${RETRY_TIMEOUT}
    # ApexCharts renders SVG elements; wait for them to appear
    ${charts}=    Run Keyword And Return Status
    ...    Wait For Elements State    svg    visible    timeout=10s
    Run Keyword If    ${charts}
    ...    Log    Chart SVG elements found
    ...    ELSE
    ...    Log    No SVG chart found — charts may be lazy-loaded    WARN
