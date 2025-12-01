import { zipSync } from 'fflate'

function makeBackupZip() {
  const payload = {
    manifest: { createdAt: Date.now(), counts: { books: 1, annotations: 0, bookmarks: 0, vocabulary: 0 } },
    metadata: [{ id: 'bk1', title: 'Book One', author: 'Auth', mediaType: 'text/plain' }],
    annotations: [],
    bookmarks: [],
    vocabulary: [],
    signature: 'stub',
  }
  const json = JSON.stringify({ manifest: payload.manifest, metadata: payload.metadata, annotations: [], bookmarks: [], vocabulary: [] })
  const files = {
    'meta/manifest.json': new TextEncoder().encode(JSON.stringify(payload.manifest)),
    'meta/signature.txt': new TextEncoder().encode('' + payload.signature),
    'data/metadata.json': new TextEncoder().encode(JSON.stringify(payload.metadata)),
    'data/annotations.json': new TextEncoder().encode('[]'),
    'data/bookmarks.json': new TextEncoder().encode('[]'),
    'data/vocabulary.json': new TextEncoder().encode('[]'),
  }
  const zip = zipSync(files, { level: 0 })
  return new File([zip], 'backup.paperread', { type: 'application/zip' })
}

describe('Import conflict modal', () => {
  it('opens conflict modal and shows decisions', () => {
    cy.visit('/index.html')
    cy.window().then((win) => {
      const file = makeBackupZip()
      // call modal directly to avoid File Picker
      return win.__openImportConflictModal(file)
    })
    cy.get('#import-modal').should('have.attr', 'role', 'dialog')
    cy.get('#import-list').find('li').should('have.length.at.least', 1)
    // choose merge for the first item if radio exists
    cy.get('#import-list').then(($list) => {
      const radios = $list.find('input[type="radio"]')
      if (radios.length > 0) {
        cy.wrap(radios[0]).check({ force: true })
        cy.get('#import-confirm').click()
        cy.get('#import-modal').should('not.be.visible')
      } else {
        cy.contains('New').should('exist')
      }
    })
    cy.get('#import-cancel').click()
    cy.get('#import-modal').should('not.be.visible')
  })
})