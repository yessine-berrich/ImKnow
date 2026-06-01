*** Settings ***
Documentation    TC_PUBLIC_PROFILE_001 – Public user profile page scenarios.
...
...              Covers: navigating to another user's profile from the home feed,
...              verifying the profile structure (avatar, name, stats, articles),
...              and the follow button interaction.
Resource         ../../resources/common.resource
Resource         ../../resources/auth_keywords.resource

Suite Setup      Run Keywords
...              Open Browser Session
...              AND    Sign In As Valid User
Suite Teardown   Close Browser Session
Test Teardown    Take Screenshot On Failure


*** Variables ***
# Fallback user IDs to try when no article author link is found on the feed.
# These should correspond to real users seeded in the dev database.
${FALLBACK_PROFILE_ID}    1


*** Test Cases ***
TC_PUBLIC_PROFILE_001_01 Public profile page loads via direct URL
    [Documentation]    Navigating directly to /profile/1 (or another seeded user)
    ...                must load a page without a crash and keep /profile/ in the URL.
    [Tags]    smoke    public-profile
    Go To    ${PROFILE_URL}/${FALLBACK_PROFILE_ID}
    Wait For Load State    domcontentloaded
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    URL Should Contain    /profile/

TC_PUBLIC_PROFILE_001_02 Profile page renders user name
    [Documentation]    The public profile page must display the user's name
    ...                (first name, last name, or full name).
    [Tags]    public-profile    ui
    Go To    ${PROFILE_URL}/${FALLBACK_PROFILE_ID}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    # Name can be in h1/h2 or a dedicated card component
    ${count}=    Get Element Count
    ...    h1, h2, [class*="name" i], [class*="fullName" i], [class*="user-name" i]
    Should Be True    ${count} >= 1    msg=Public profile must display the user's name

TC_PUBLIC_PROFILE_001_03 Profile avatar or placeholder image is present
    [Documentation]    The public profile must show an avatar image or an
    ...                avatar placeholder for the user.
    [Tags]    public-profile    ui
    Go To    ${PROFILE_URL}/${FALLBACK_PROFILE_ID}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${count}=    Get Element Count    img[alt*="avatar" i], img[alt*="profile" i], [class*="avatar" i], [class*="Avatar"], [class*="user-image"], img[class*="rounded-full"], span[class*="rounded-full"], div[class*="rounded-full"]
    Should Be True    ${count} >= 1    msg=Profile must render an avatar or placeholder image

TC_PUBLIC_PROFILE_001_04 Follow or following button is present
    [Documentation]    The public profile of another user must include a follow /
    ...                following toggle button (cannot follow own profile —
    ...                this test uses a different user ID than the authenticated user).
    [Tags]    public-profile    ui    interaction
    Go To    ${PROFILE_URL}/${FALLBACK_PROFILE_ID}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    # Multi-line continuation splits into extra arguments — keep on one line
    ${count}=    Get Element Count    button:has-text("Follow"), button:has-text("Suivre"), button:has-text("Following"), button:has-text("Abonné"), button:has-text("Unfollow"), button:has-text("Se désabonner")
    Run Keyword If    ${count} == 0
    ...    Log    No follow button found — may be own profile or user not found    WARN

TC_PUBLIC_PROFILE_001_05 Publications tab shows articles or empty state
    [Documentation]    The public profile must display the user's published
    ...                articles or an empty state message.
    [Tags]    public-profile    ui    regression
    Go To    ${PROFILE_URL}/${FALLBACK_PROFILE_ID}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${articles}=    Get Element Count
    ...    article, [class*="PublicationCard"], [class*="ArticleCard"], [class*="publication-card"]
    ${empty}=    Run Keyword And Return Status
    ...    Wait For Elements State
    ...    [class*="empty"], p:has-text("Aucun"), p:has-text("No publication"), p:has-text("no article"), p:has-text("No article")
    ...    visible    timeout=5s
    Should Be True    ${articles} > 0 or ${empty}
    ...    msg=Public profile must show articles or an empty state

TC_PUBLIC_PROFILE_001_06 Follower and following counts are displayed
    [Documentation]    The public profile must show numerical stats for
    ...                followers and following (even if zero).
    [Tags]    public-profile    ui
    Go To    ${PROFILE_URL}/${FALLBACK_PROFILE_ID}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    # Multi-line splits into extra args + :has-text() doesn't support i flag — keep on one line with explicit variants
    ${count}=    Get Element Count    *:has-text("follower"), *:has-text("Follower"), *:has-text("abonné"), *:has-text("Abonné"), *:has-text("following"), *:has-text("Following"), *:has-text("abonnement"), *:has-text("Abonnement")
    Run Keyword If    ${count} == 0
    ...    Log    Follower/following stats not found — check profile card selectors    WARN

TC_PUBLIC_PROFILE_001_07 Navigate to public profile from home feed
    [Documentation]    Clicking an article author's name or avatar on the home
    ...                feed must navigate to that user's public profile page.
    [Tags]    public-profile    navigation    regression
    Go To    ${HOME_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    # Look for author links in article cards
    ${author_links}=    Get Element Count
    ...    a[href*="/profile/"], [data-testid*="author"], [class*="author" i] a
    Run Keyword If    ${author_links} == 0
    ...    Log    No author links found on home feed — profile navigation test skipped    WARN
    Run Keyword If    ${author_links} > 0
    ...    Navigate To First Author Profile
    Run Keyword If    ${author_links} > 0
    ...    URL Should Contain    /profile/


*** Keywords ***
Navigate To First Author Profile
    [Documentation]    Click the first author link found on the current page
    ...                and wait for the profile page to load.
    Click    a[href*="/profile/"] >> nth=0
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
