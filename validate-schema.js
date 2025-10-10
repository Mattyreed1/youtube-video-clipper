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

// Check nullable fields (fields that can receive null values from the code)
const nullableFields = ['thumbnailUrl', 'actualResolution', 'actualHeight', 
    'qualityWarning', 'error', 'url', 'duration', 'size', 'outputFormat',
    'quality', 'maxHeight', 'requestedQuality', 'eventCharged'];

const nonNullableErrors = [];
for (const field of nullableFields) {
    const fieldDef = actorConfig.storages.dataset.fields.properties[field];
    if (fieldDef) {
        // Check if type is an array (e.g., ["string", "null"]) or just a string
        if (!Array.isArray(fieldDef.type)) {
            console.log(`❌ Field '${field}' should allow null: change "type": "${fieldDef.type}" to "type": ["${fieldDef.type}", "null"]`);
            nonNullableErrors.push(field);
        } else if (!fieldDef.type.includes('null')) {
            console.log(`❌ Field '${field}' type array does not include "null": ${JSON.stringify(fieldDef.type)}`);
            nonNullableErrors.push(field);
        }
    }
}

if (nonNullableErrors.length === 0) {
    console.log('✅ All nullable fields properly configured\n');
} else {
    console.log('');
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

if (missingFields.length === 0 && nonNullableErrors.length === 0) {
    console.log('\n✅ Schema validation PASSED - All fields are properly defined!');
    process.exit(0);
} else {
    console.log('\n❌ Schema validation FAILED');
    if (missingFields.length > 0) {
        console.log('   - Missing fields in schema');
    }
    if (nonNullableErrors.length > 0) {
        console.log('   - Nullable field type mismatches');
    }
    console.log('   Please fix the issues above in actor.json\n');
    process.exit(1);
}

