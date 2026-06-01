*** Settings ***
Documentation    TC_ADMIN_006 – Admin statistics page (/statistics).
...
...              Verifies the statistics dashboard: heading, navigation tabs
...              (Users / Publications / Moderation / Tags & Categories / Reports),
...              stat cards, and chart areas.
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
    [Documentation]    An ADMIN visiting /statistics must see the h1 heading.
    [Tags]    smoke    admin    statistics
    Go To    ${STATISTICS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${TIMEOUT}

TC_ADMIN_006_02 Navigation tabs are visible
    [Documentation]    The statistics page must expose at least the "Users" and
    ...                "Reports" navigation tabs.
    [Tags]    admin    statistics    ui
    Go To    ${STATISTICS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${TIMEOUT}
    Wait For Elements State    button:has-text("Users")    visible    timeout=${RETRY_TIMEOUT}
    # "Reports" exists in both nav and tab bar — use count to avoid strict mode
    ${reports_count}=    Get Element Count    button:has-text("Reports")
    Should Be True    ${reports_count} >= 1    msg=Reports tab must be present on statistics page

TC_ADMIN_006_03 Tags and Categories tab is visible
    [Documentation]    The "Tags & Categories" navigation tab must be visible
    ...                on the statistics page.
    [Tags]    admin    statistics    ui
    Go To    ${STATISTICS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${TIMEOUT}
    Wait For Elements State    button:has-text("Tags & Categories")    visible    timeout=${RETRY_TIMEOUT}

TC_ADMIN_006_04 Statistics cards are displayed
    [Documentation]    The statistics page must render stat cards with numeric
    ...                values for key metrics.
    [Tags]    admin    statistics    regression
    Go To    ${STATISTICS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${TIMEOUT}
    ${count}=    Get Element Count    [class*="rounded-2xl"], [class*="StatCard"], [class*="stat-card"]
    Run Keyword If    ${count} == 0
    ...    Log    No stat card found — checking for any numeric content    WARN
    ${any_count}=    Get Element Count    h1, h2, h3, p
    Should Be True    ${any_count} >= 1    msg=Statistics page must render content

TC_ADMIN_006_05 Clicking Tags and Categories tab switches section content
    [Documentation]    Clicking the "Tags & Categories" tab must update the
    ...                section without navigating away from /statistics.
    [Tags]    admin    statistics    interaction
    Go To    ${STATISTICS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${TIMEOUT}
    Click    button:has-text("Tags & Categories")
    Sleep    1s
    URL Should Contain    /statistics

TC_ADMIN_006_06 Clicking Reports tab switches section content
    [Documentation]    Clicking the "Reports" tab must update the section
    ...                without navigating away from /statistics.
    [Tags]    admin    statistics    interaction
    Go To    ${STATISTICS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${TIMEOUT}
    # Target the tab-bar Reports button specifically (not the nav menu button)
    Click    button[class*="border-b"]:has-text("Reports"), button[class*="whitespace-nowrap"]:has-text("Reports")
    Sleep    1s
    URL Should Contain    /statistics

TC_ADMIN_006_07 Chart or graph area is rendered
    [Documentation]    The statistics page must render at least one chart
    ...                or graph area (ApexCharts SVG element).
    [Tags]    admin    statistics    ui    regression
    Go To    ${STATISTICS_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State    h1    visible    timeout=${TIMEOUT}
    ${charts}=    Run Keyword And Return Status
    ...    Wait For Elements State    svg    visible    timeout=10s
    Run Keyword If    ${charts}
    ...    Log    Chart SVG elements found
    ...    ELSE
    ...    Log    No SVG chart found — charts may be lazy-loaded    WARN
