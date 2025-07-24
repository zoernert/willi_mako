import { ContextManager } from './src/services/contextManager';
import geminiService from './src/services/gemini';
import dotenv from 'dotenv';

dotenv.config();

async function testEndToEndWorkspaceOnly() {
  console.log('🔍 Testing End-to-End Workspace-Only Chat');
  console.log('==========================================');
  
  const userId = '3a851622-0858-4eb0-b1ea-13c354c87bbe';
  const query = 'Wie hoch ist die Dienstleistung der STROMDAO?';
  
  const contextSettings = {
    useWorkspaceOnly: true,
    workspacePriority: 'high' as const,
    includeUserDocuments: true,
    includeUserNotes: true,
    includeSystemKnowledge: false,
  };
  
  console.log(`\n📋 User: ${userId}`);
  console.log(`🔎 Query: "${query}"`);
  console.log(`⚙️  Context settings:`, contextSettings);
  
  try {
    // Step 1: Determine context (like in chat route)
    console.log('\n📊 Step 1: Determining context...');
    const contextManager = new ContextManager();
    const { userContext, contextDecision } = await contextManager.determineOptimalContext(
      query,
      userId,
      [],
      contextSettings
    );
    
    console.log(`   User Documents Found: ${userContext.userDocuments.length}`);
    console.log(`   Context Decision:`, contextDecision);
    
    // Step 2: Generate response (like in chat route)
    console.log('\n🤖 Step 2: Generating AI response...');
    
    let aiResponse;
    let contextMode: 'workspace-only' | 'standard' | 'system-only' = 'workspace-only';
    
    if (contextDecision.useUserContext && (userContext.userDocuments.length > 0 || userContext.userNotes.length > 0)) {
      console.log('   Using generateResponseWithUserContext (with workspace-only mode)');
      aiResponse = await geminiService.generateResponseWithUserContext(
        [{ role: 'user', content: query }],
        '', // No public context in workspace-only mode
        userContext.userDocuments,
        userContext.userNotes,
        {},
        contextMode
      );
    } else {
      console.log('   Using generateResponse (fallback)');
      aiResponse = await geminiService.generateResponse(
        [{ role: 'user', content: query }],
        '',
        {},
        false,
        contextMode
      );
    }
    
    console.log('\n📝 Generated Response:');
    console.log('======================');
    console.log(aiResponse);
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

testEndToEndWorkspaceOnly().catch(console.error);
