describe('Tags modal batch operations', () => {
  it('opens tag modal and shows assign/remove buttons', () => {
    cy.visit('/index.html')
    cy.get('#tag-manage').click()
    cy.get('#tag-modal').should('have.attr', 'role', 'dialog')
    cy.get('#tag-assign-list').should('exist')
    cy.get('#tag-list').should('exist')
    cy.get('#tag-close').click()
    cy.get('#tag-modal').should('not.be.visible')
  })
})