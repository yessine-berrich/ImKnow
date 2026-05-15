@echo off
:: ─────────────────────────────────────────────────────────────────────────────
:: ImKnow – Robot Framework test runner
:: Usage:
::   run_tests.bat                  → run all tests
::   run_tests.bat smoke            → run only tests tagged "smoke"
::   run_tests.bat auth             → run only tests tagged "auth"
::   run_tests.bat tests\01_authentication   → run specific suite folder
:: ─────────────────────────────────────────────────────────────────────────────

set TAG=%1
set SUITE=%2
set RESULTS=results
set TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

:: Create results directory
if not exist "%RESULTS%" mkdir "%RESULTS%"

:: Choose what to run
if "%TAG%"=="" (
    echo Running ALL tests...
    robot --outputdir %RESULTS% --log log_%TIMESTAMP%.html --report report_%TIMESTAMP%.html tests\
) else (
    if exist "tests\%TAG%" (
        echo Running suite: tests\%TAG%
        robot --outputdir %RESULTS% --log log_%TIMESTAMP%.html --report report_%TIMESTAMP%.html tests\%TAG%
    ) else (
        echo Running tests with tag: %TAG%
        robot --outputdir %RESULTS% --include %TAG% --log log_%TIMESTAMP%.html --report report_%TIMESTAMP%.html tests\
    )
)

echo.
echo Results saved to: %RESULTS%\
pause
