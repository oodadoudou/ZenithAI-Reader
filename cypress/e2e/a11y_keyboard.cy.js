describe('Accessibility and Keyboard Navigation', () => {
  before(() => {
    // Ensure vite preview is running in CI before this spec
  })

  it('index page: key controls present and focusable', () => {
    cy.visit('/index.html')
    cy.findByLabelText('Search library').focus().should('be.focused')
    cy.get('#sort-select').should('exist')
  })

  it('reading page: quick settings open/close works', () => {
    cy.visit('/reading.html?bookId=demo')
    cy.get('#reader-quick-settings').click()
    cy.get('#quick-settings-panel').should('have.attr', 'role', 'dialog')
    cy.get('#quick-settings-close').click()
    cy.get('#quick-settings-panel').should('not.have.class', 'is-visible')
  })
})