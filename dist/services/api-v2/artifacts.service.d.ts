import { Artifact, CreateArtifactRequestBody } from '../../domain/api-v2/artifacts.types';
interface CreateArtifactInput extends CreateArtifactRequestBody {
    userId: string;
}
export declare class ArtifactsService {
    private readonly artifacts;
    createArtifact(input: CreateArtifactInput): Promise<Artifact>;
    getArtifactForUser(artifactId: string, userId: string): Promise<Artifact>;
    private assertValidSessionId;
    private assertValidType;
    private assertValidName;
    private assertValidMimeType;
    private sanitizeDescription;
    private sanitizeTags;
    private sanitizeMetadata;
    private sanitizeVersion;
    private toBuffer;
    private assertWithinSize;
    private buildStorage;
    private buildPreview;
    private toPublicArtifact;
}
export declare const artifactsService: ArtifactsService;
export {};
//# sourceMappingURL=artifacts.service.d.ts.map