*** Settings ***
Documentation    TC_ERROR_001 – Error pages (403 and 404) scenarios.
...
...              Verifies that the 403 Forbidden and 404 Not Found pages
...              render correctly with appropriate messages and navigation.
...              The suite runs unauthenticated (no Suite Setup sign-in).
Resource         ../../resources/common.resource
Resource         ../../resources/auth_keywords.resource

Suite Setup      Open Browser Session
Suite Teardown   Close Browser Session
Test Teardown    Take Screenshot On Failure


*** Test Cases ***
TC_ERROR_001_01 Error 403 page loads at /error-403
    [Documentation]    Navigating directly to /error-403 must render the page
    ...                without a crash.
    [Tags]    smoke    error-pages    security
    Go To    ${ERROR_403_URL}
    Wait For Load State    domcontentloaded
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    URL Should Contain    /error-403

TC_ERROR_001_02 Error 403 page displays a forbidden or access-denied message
    [Documentation]    The 403 page must show text indicating the user does not
    ...                have permission (403, "accès refusé", "forbidden", etc.).
    [Tags]    error-pages    ui    security
    Go To    ${ERROR_403_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    # Single-line CSS selector — multiple selectors joined with comma
    ${count}=    Get Element Count    *:has-text("403"), *:has-text("Forbidden"), *:has-text("accès refusé"), *:has-text("permission"), *:has-text("autorisé"), *:has-text("interdit")
    Should Be True    ${count} >= 1    msg=403 page must display a forbidden or access-denied message

TC_ERROR_001_03 Error 403 page has a navigation button or link
    [Documentation]    The 403 page uses React router buttons (not <a> links).
    ...                It must have at least one navigation button/link to let
    ...                the user return to the previous page or go back home.
    ...                (Buttons: "Previous Page", "Back to Home" in English.)
    [Tags]    error-pages    navigation
    Go To    ${ERROR_403_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    # The 403 page renders two <button onClick={router.back/push}> elements
    ${btn_count}=    Get Element Count    button[class*="px-6"], button[class*="rounded-xl"]
    # Also check for any link pointing to home or signin
    ${link_count}=    Get Element Count    a[href="/home"], a[href="/signin"], a[href="/"]
    # Generic: any button with navigation text
    ${nav_btn}=    Get Element Count    button:has-text("Page"), button:has-text("Home"), button:has-text("Accueil"), button:has-text("Précédent"), button:has-text("Previous"), button:has-text("Back")
    ${total}=    Evaluate    ${btn_count} + ${link_count} + ${nav_btn}
    Should Be True    ${total} >= 1    msg=403 page must contain at least one navigation button or link

TC_ERROR_001_04 Error 404 page loads at /error-404
    [Documentation]    Navigating directly to /error-404 must render the page
    ...                without a crash.
    [Tags]    smoke    error-pages
    Go To    ${ERROR_404_URL}
    Wait For Load State    domcontentloaded
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    URL Should Contain    /error-404

TC_ERROR_001_05 Error 404 page displays a not-found message
    [Documentation]    The 404 page must show text indicating the resource was
    ...                not found (404, "not found", "introuvable", etc.).
    [Tags]    error-pages    ui
    Go To    ${ERROR_404_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${count}=    Get Element Count    *:has-text("404"), *:has-text("Not Found"), *:has-text("introuvable"), *:has-text("page inexistante"), *:has-text("existe pas")
    Should Be True    ${count} >= 1    msg=404 page must display a not-found message

TC_ERROR_001_06 Error 404 page has a navigation link back to home
    [Documentation]    The 404 page must include at least one link or button
    ...                that lets the user navigate to a valid page.
    [Tags]    error-pages    navigation
    Go To    ${ERROR_404_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${count}=    Get Element Count    a[href="/home"], a[href="/signin"], a[href="/"], button:has-text("Retour"), a:has-text("Home"), a:has-text("Accueil")
    Should Be True    ${count} >= 1    msg=404 page must contain a link back to a valid page

TC_ERROR_001_07 Visiting unknown route is handled gracefully
    [Documentation]    Navigating to a completely unknown route must be handled
    ...                by the app without crashing (blank page / JS error).
    ...                The app may redirect to /signin, render a Next.js 404,
    ...                redirect to /error-404, or render another valid page.
    [Tags]    error-pages    regression
    Go To    ${BASE_URL}/this-route-does-not-exist-xyz
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${url}=    Get URL
    Log    Unknown route resulted in URL: ${url}    INFO
    # The page must render SOMETHING — not a completely blank page
    ${has_content}=    Get Element Count    h1, h2, p, div[class], main, body > div
    Should Be True    ${has_content} >= 1
    ...    msg=Unknown route must render some page content (app must not crash)

TC_ERROR_001_08 Unauthenticated user accessing home page is handled gracefully
    [Documentation]    An unauthenticated browser navigating to /home must be
    ...                handled by the app: redirect to /signin (guarded route)
    ...                or show the home page (public route). The app must not
    ...                crash or display a blank screen.
    [Tags]    error-pages    security    regression
    Go To    ${HOME_URL}
    Wait For Load State    networkidle    timeout=${RETRY_TIMEOUT}
    ${url}=    Get URL
    Log    Unauthenticated /home resulted in URL: ${url}    INFO
    ${on_signin}=    Run Keyword And Return Status    URL Should Contain    /signin
    ${on_home}=    Run Keyword And Return Status    URL Should Contain    /home
    ${on_error}=    Run Keyword And Return Status    URL Should Contain    /error
    Should Be True    ${on_signin} or ${on_home} or ${on_error}
    ...    msg=App must handle unauthenticated /home access (redirect to signin, home, or error)
