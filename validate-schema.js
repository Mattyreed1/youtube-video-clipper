import fs from 'fs';

/**
 * Validation script to ensure dataset schema matches all fields pushed by the actor
 * This prevents schema validation errors when the actor writes to the dataset
 */

console.log('🔍 Validating Dataset Schema...\n');

// Read actor.json schema
const actorConfig = JSON.parse(fs.readFileSync('./.actor/actor.json', 'utf-8'));
const schemaFields = Object.keys(actorConfig.storages.dataset.fields.properties);

// Fields that should be in the schema (from main.js analysis)
const clipFields = [
    'name', 'description', 'startTime', 'endTime', 'url', 'thumbnailUrl',
    'duration', 'size', 'quality', 'maxHeight', 'actualResolution', 'actualHeight',
    'qualityWarning', 'outputFormat', 'clipIndex', 'videoUrl', 'processingTime',
    'failed', 'charged', 'requestedQuality', 'eventCharged', 'error'
];

const summaryFields = [
    '#summary', 'totalClips', 'processedCount', 'failedCount', 
    'runStartCharged', 'runFinished', 'qualityUsed', 'resumedFromPrevious'
];

const allRequiredFields = [...clipFields, ...summaryFields];

console.log('📋 Schema contains fields:', schemaFields.length);
console.log('📋 Actor pushes fields:', allRequiredFields.length);
console.log('');

// Check for missing fields
const missingFields = allRequiredFields.filter(field => !schemaFields.includes(field));
const extraFields = schemaFields.filter(field => !allRequiredFields.includes(field));

if (missingFields.length > 0) {
    console.log('❌ Missing fields in schema:');
    missingFields.forEach(field => console.log(`   - ${field}`));
    console.log('');
} else {
    console.log('✅ All required fields present in schema\n');
}

if (extraFields.length > 0) {
    console.log('⚠️  Extra fields in schema (not pushed by actor):');
    extraFields.forEach(field => console.log(`   - ${field}`));
    console.log('');
}

// Verify JSON is valid
console.log('✅ actor.json is valid JSON');

// Check views configuration
const views = actorConfig.storages.dataset.views;
console.log(`\n📊 Dataset views configured: ${Object.keys(views).length}`);
Object.keys(views).forEach(viewName => {
    console.log(`   - ${viewName}: ${views[viewName].title}`);
});

if (missingFields.length === 0) {
    console.log('\n✅ Schema validation PASSED - All fields are properly defined!');
    process.exit(0);
} else {
    console.log('\n❌ Schema validation FAILED - Please add missing fields to actor.json');
    process.exit(1);
}

