/**
 * Baseline setup for all tests
 */
beforeEach(() => {
    // Work around: configure jest tests to be failures
    // if there are no assertions present.
    // Prevents empty tests from being no-op false positives
    expect.hasAssertions();
});
