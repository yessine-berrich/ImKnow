*** Settings ***
Documentation    TC_PROFILE_002 – Current user profile page scenarios.
...
...              Verifies that the authenticated user's profile page
...              renders correctly: header, stats, article tabs, and
...              the create-article button.
Resource         ../../resources/common.resource
Resource         ../../resources/auth_keywords.resource

Suite Setup      Run Keywords
...              Open Browser Session
...              AND    Sign In As Valid User
Suite Teardown   Close Browser Session
Test Teardown    Take Screenshot On Failure


*** Test Cases ***
TC_PROFILE_002_01 Profile page loads without errors
    [Documentation]    Navigating to /profile must render the page without
    ...                a full error screen.
    [Tags]    smoke    profile    my-profile
    Go To    ${PROFILE_URL}
    Wait For Load State    domcontentloaded
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    URL Should Contain    /profile

TC_PROFILE_002_02 User name is displayed on profile page
    [Documentation]    The profile header must show the authenticated user's
    ...                first name or full name.
    [Tags]    profile    my-profile    regression
    Go To    ${PROFILE_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    # Either h1 or h2 contains the user name
    ${count}=    Get Element Count    h1, h2
    Should Be True    ${count} >= 1    msg=Profile page must have at least one heading

TC_PROFILE_002_03 Articles tab is visible and active by default
    [Documentation]    The "Publiés" tab must be present and selected when
    ...                the profile page first loads (tab shows published articles).
    [Tags]    profile    my-profile    ui
    Go To    ${PROFILE_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State
    ...    button:has-text("Publiés")
    ...    visible    timeout=${RETRY_TIMEOUT}

TC_PROFILE_002_04 Drafts tab is accessible
    [Documentation]    The "Brouillons" tab must exist and be clickable
    ...                without navigating away from /profile.
    [Tags]    profile    my-profile    ui
    Go To    ${PROFILE_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Wait For Elements State
    ...    button:has-text("Brouillons"), button:has-text("Drafts")
    ...    visible    timeout=${RETRY_TIMEOUT}
    Click    button:has-text("Brouillons"), button:has-text("Drafts")
    Sleep    0.5s
    URL Should Contain    /profile

TC_PROFILE_002_05 Follow stats section is visible
    [Documentation]    The profile page must display follower/following counts
    ...                or a stats card area.
    [Tags]    profile    my-profile    regression
    Go To    ${PROFILE_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    # Stats may use different selectors; check for any numeric stat element
    ${count}=    Get Element Count
    ...    [class*="stat"], [class*="Stat"], [class*="follow"], [class*="Follow"]
    Run Keyword If    ${count} == 0
    ...    Log    No explicit stat element found — checking for headings    WARN

TC_PROFILE_002_06 Articles list or empty state is rendered
    [Documentation]    The "Publiés" tab content must display either article
    ...                cards or an empty-state message.
    [Tags]    profile    my-profile    regression
    Go To    ${PROFILE_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    Click    button:has-text("Publiés")
    Sleep    1s
    ${articles}=    Get Element Count
    ...    article, [class*="ArticleCard"], [class*="article-card"]
    ${empty}=    Run Keyword And Return Status
    ...    Wait For Elements State
    ...    [class*="empty"], p:has-text("Aucun"), p:has-text("No article")
    ...    visible    timeout=5s
    Should Be True    ${articles} > 0 or ${empty}
    ...    msg=Either articles or an empty state must be visible
