import { ContextManager } from './src/services/contextManager';
import dotenv from 'dotenv';

dotenv.config();

async function testContextManager() {
  console.log('🔍 Testing ContextManager');
  console.log('==========================');
  
  const userId = '3a851622-0858-4eb0-b1ea-13c354c87bbe';
  const query = 'Wie hoch ist die Dienstleistung der STROMDAO?';
  
  const contextSettings = {
    useWorkspaceOnly: true,
    workspacePriority: 'high' as const,
    includeUserDocuments: true,
    includeUserNotes: true,
    includeSystemKnowledge: false,
  };
  
  console.log(`\n📋 Testing context determination for user: ${userId}`);
  console.log(`🔎 Query: "${query}"`);
  console.log(`⚙️  Context settings:`, contextSettings);
  
  try {
    const contextManager = new ContextManager();
    const result = await contextManager.determineOptimalContext(
      query,
      userId,
      [],
      contextSettings
    );
    
    console.log('\n📊 Context Analysis Result:');
    console.log('==========================');
    console.log('Public Context Sources:', result.publicContext.length);
    console.log('User Documents Found:', result.userContext.userDocuments.length);
    console.log('User Notes Found:', result.userContext.userNotes.length);
    console.log('Context Decision:', result.contextDecision);
    console.log('Context Summary:', result.userContext.contextSummary);
    
    if (result.userContext.userDocuments.length > 0) {
      console.log('\n📄 User Documents:');
      result.userContext.userDocuments.forEach((doc, index) => {
        console.log(`${index + 1}. ${doc.substring(0, 200)}...`);
      });
    }
    
    if (result.userContext.userNotes.length > 0) {
      console.log('\n📝 User Notes:');
      result.userContext.userNotes.forEach((note, index) => {
        console.log(`${index + 1}. ${note.substring(0, 200)}...`);
      });
    }
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

testContextManager().catch(console.error);
