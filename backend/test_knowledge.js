const assert = require('assert');
const knowledgeEngine = require('./knowledgeEngine');

console.log('--- TESTING J.A.R.V.I.S KNOWLEDGE ENGINE ---');

// 1. Test loading knowledge
const initialEntries = knowledgeEngine.getAllKnowledge();
console.log(`[PASS] Loaded ${initialEntries.length} initial knowledge item(s).`);
assert(initialEntries.length > 0, 'Should contain at least one knowledge entry');

// 2. Test search matching for "what is agi?"
const prompt1 = "Jarvis, what is your understanding of AGI?";
const matches = knowledgeEngine.findRelevantKnowledge(prompt1);
console.log(`[PASS] Matches found for prompt "${prompt1}":`, matches.map(m => m.topic));
assert(matches.length > 0, 'Should find AGI knowledge for prompt mentioning AGI');
assert(matches[0].topic.includes('AGI'), 'Top match should be AGI');

// 3. Test snippet generation
const snippet = knowledgeEngine.getKnowledgeContextSnippet("tell me about artificial general intelligence");
console.log('[PASS] Generated context snippet:\n', snippet);
assert(snippet && snippet.includes('autonomous cognitive framework'), 'Snippet should contain custom knowledge text');

// 4. Test dynamic saving (remembering a new fact)
const testTopic = "Test Superconductor Project";
const testContent = "Room temperature superconductor project code named Vulcan is in phase 2.";
const saveRes = knowledgeEngine.saveKnowledge({
  topic: testTopic,
  content: testContent,
  keywords: ["superconductor", "vulcan", "phase 2"]
});
console.log('[PASS] Saved dynamic knowledge:', saveRes.item.id);
assert(saveRes.success === true, 'Saving knowledge should succeed');

// 5. Test retrieving newly saved fact
const vulcanMatches = knowledgeEngine.findRelevantKnowledge("what is the status of vulcan superconductor?");
console.log('[PASS] Matches found for Vulcan prompt:', vulcanMatches.map(m => m.topic));
assert(vulcanMatches.length > 0 && vulcanMatches[0].topic === testTopic, 'Should match dynamically saved topic');

// 6. Clean up test fact
const delRes = knowledgeEngine.deleteKnowledge(saveRes.item.id);
console.log('[PASS] Cleaned up temporary test fact:', delRes);
assert(delRes.success === true, 'Delete should succeed');

console.log('\n>>> ALL KNOWLEDGE ENGINE TESTS PASSED SUCCESSFULLY! <<<');
