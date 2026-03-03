// Supabase Storage Service - Complete replacement for local filesystem uploads
import { createClient } from '@supabase/supabase-js';

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
  forensic?: any;
}

export interface StorageConfig {
  bucket: string;
  maxSize: number;
  allowedTypes: string[];
}

class SupabaseStorageService {
  private supabase: any;
  private bucket: string = 'uploads';
  private requestId: string;

  constructor(supabaseUrl: string, serviceRoleKey: string, requestId: string) {
    this.supabase = createClient(supabaseUrl, serviceRoleKey);
    this.requestId = requestId;
    
    console.log(`🗄️ [${requestId}] Supabase Storage Service initialized`);
    console.log(`🗄️ [${requestId}] Bucket: ${this.bucket}`);
  }

  async ensureBucketExists(): Promise<boolean> {
    console.log(`🗄️ [${this.requestId}] === BUCKET VERIFICATION ===`);
    
    try {
      // List buckets to check if 'uploads' exists
      const { data: buckets, error: bucketsError } = await this.supabase.storage.listBuckets();
      
      console.log(`🗄️ [${this.requestId}] Available buckets:`, buckets?.map(b => b.name) || 'NONE');
      
      if (bucketsError) {
        console.error(`❌ [${this.requestId}] Failed to list buckets:`, bucketsError);
        return false;
      }

      const uploadsBucket = buckets?.find(b => b.name === this.bucket);
      
      if (!uploadsBucket) {
        console.error(`❌ [${this.requestId}] CRITICAL: Bucket '${this.bucket}' does not exist`);
        console.error(`❌ [${this.requestId}] Required action: Create bucket 'uploads' in Supabase dashboard`);
        console.error(`❌ [${this.requestId}] Settings: Public bucket, allow all uploads`);
        return false;
      }

      console.log(`✅ [${this.requestId}] Bucket '${this.bucket}' exists and is accessible`);
      
      // Check bucket is public
      const { data: bucketPolicy } = await this.supabase.storage.getBucket(this.bucket);
      console.log(`🗄️ [${this.requestId}] Bucket policy:`, {
        public: bucketPolicy?.public,
        file_size_limit: bucketPolicy?.file_size_limit,
        allowed_mime_types: bucketPolicy?.allowed_mime_types
      });

      if (!bucketPolicy?.public) {
        console.error(`❌ [${this.requestId}] Bucket '${this.bucket}' is not public`);
        console.error(`❌ [${this.requestId}] Required action: Make bucket public in Supabase dashboard`);
      }

      return bucketPolicy?.public || false;
      
    } catch (error) {
      console.error(`❌ [${this.requestId}] Bucket verification EXCEPTION:`, error);
      return false;
    }
  }

  async uploadFile(
    file: Buffer | Uint8Array, 
    fileName: string, 
    contentType: string
  ): Promise<UploadResult> {
    console.log(`📤 [${this.requestId}] === FILE UPLOAD FORENSIC AUDIT ===`);
    console.log(`📤 [${this.requestId}] Upload details:`, {
      fileName,
      contentType,
      fileSize: file.length,
      bucket: this.bucket
    });

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(contentType)) {
      const error = `File type ${contentType} not allowed. Allowed: ${allowedTypes.join(', ')}`;
      console.error(`❌ [${this.requestId}] ${error}`);
      return {
        success: false,
        error,
        forensic: {
          fileName,
          contentType,
          allowedTypes,
          reason: 'invalid_file_type'
        }
      };
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.length > maxSize) {
      const error = `File size ${file.length} bytes exceeds maximum ${maxSize} bytes`;
      console.error(`❌ [${this.requestId}] ${error}`);
      return {
        success: false,
        error,
        forensic: {
          fileName,
          fileSize: file.length,
          maxSize,
          reason: 'file_too_large'
        }
      };
    }

    // Ensure bucket exists and is public
    const bucketReady = await this.ensureBucketExists();
    if (!bucketReady) {
      return {
        success: false,
        error: 'Storage bucket not ready - check logs',
        forensic: {
          reason: 'bucket_not_ready'
        }
      };
    }

    try {
      console.log(`📤 [${this.requestId}] Uploading to Supabase Storage...`);
      
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .upload(fileName, file, {
          contentType,
          cacheControl: '3600',
          upsert: false // Don't overwrite existing files
        });

      console.log(`📤 [${this.requestId}] Upload result:`, {
        success: !error,
        error: error || 'NO_ERROR',
        data: data ? 'UPLOAD_DATA_RECEIVED' : 'NULL_DATA'
      });

      if (error) {
        console.error(`❌ [${this.requestId}] Upload failed:`, JSON.stringify(error, null, 2));
        
        // Try with timestamp prefix if filename exists
        if (error.message?.includes('duplicate')) {
          const timestampedFileName = `${Date.now()}-${fileName}`;
          console.log(`📤 [${this.requestId}] Retrying with timestamped filename: ${timestampedFileName}`);
          
          const { data: retryData, error: retryError } = await this.supabase.storage
            .from(this.bucket)
            .upload(timestampedFileName, file, {
              contentType,
              cacheControl: '3600',
              upsert: false
            });

          if (retryError) {
            console.error(`❌ [${this.requestId}] Retry upload also failed:`, retryError);
            return {
              success: false,
              error: retryError.message,
              forensic: {
                originalFileName: fileName,
                retryFileName: timestampedFileName,
                originalError: error,
                retryError: retryError
              }
            };
          }

          console.log(`✅ [${this.requestId}] Retry upload successful: ${timestampedFileName}`);
          
          // Get public URL for retry
          const { data: { publicUrl } } = this.supabase.storage
            .from(this.bucket)
            .getPublicUrl(timestampedFileName);

          return {
            success: true,
            url: publicUrl,
            path: timestampedFileName,
            forensic: {
              originalFileName: fileName,
              finalFileName: timestampedFileName,
              retryUsed: true
            }
          };
        }

        return {
          success: false,
          error: error.message,
          forensic: {
            fileName,
            uploadError: error
          }
        };
      }

      if (!data) {
        console.error(`❌ [${this.requestId}] Upload succeeded but returned NULL data`);
        return {
          success: false,
          error: 'Upload succeeded but no data returned',
          forensic: {
            fileName,
            reason: 'null_upload_data'
          }
        };
      }

      console.log(`✅ [${this.requestId}] Upload successful:`, data);

      // Get public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from(this.bucket)
        .getPublicUrl(data.path);

      console.log(`✅ [${this.requestId}] Generated public URL: ${publicUrl}`);

      // Verify URL is accessible
      try {
        const response = await fetch(publicUrl, { method: 'HEAD' });
        console.log(`📤 [${this.requestId}] URL verification:`, {
          status: response.status,
          ok: response.ok,
          contentType: response.headers.get('content-type')
        });

        if (!response.ok) {
          console.warn(`⚠️ [${this.requestId}] Uploaded file not immediately accessible: ${response.status}`);
        }
      } catch (verifyError) {
        console.warn(`⚠️ [${this.requestId}] URL verification failed:`, verifyError);
      }

      return {
        success: true,
        url: publicUrl,
        path: data.path,
        forensic: {
          fileName,
          uploadPath: data.path,
          publicUrl,
          fileSize: file.length
        }
      };

    } catch (error: any) {
      console.error(`❌ [${this.requestId}] Upload CRITICAL ERROR:`, JSON.stringify(error, null, 2));
      return {
        success: false,
        error: error.message,
        forensic: {
          fileName,
          errorMessage: error.message,
          errorStack: error.stack,
          errorName: error.name
        }
      };
    }
  }

  async deleteFile(filePath: string): Promise<boolean> {
    console.log(`🗑️ [${this.requestId}] === FILE DELETE FORENSIC AUDIT ===`);
    console.log(`🗑️ [${this.requestId}] Deleting file: ${filePath}`);

    try {
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .remove([filePath]);

      if (error) {
        console.error(`❌ [${this.requestId}] Delete failed:`, error);
        return false;
      }

      console.log(`✅ [${this.requestId}] File deleted successfully: ${filePath}`);
      return true;

    } catch (error: any) {
      console.error(`❌ [${this.requestId}] Delete CRITICAL ERROR:`, error);
      return false;
    }
  }

  async listFiles(prefix: string = ''): Promise<any[]> {
    console.log(`📋 [${this.requestId}] === FILE LIST FORENSIC AUDIT ===`);
    console.log(`📋 [${this.requestId}] Listing files with prefix: ${prefix}`);

    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .list(prefix);

      if (error) {
        console.error(`❌ [${this.requestId}] List failed:`, error);
        return [];
      }

      console.log(`📋 [${this.requestId}] Found ${data?.length || 0} files`);
      return data || [];

    } catch (error: any) {
      console.error(`❌ [${this.requestId}] List CRITICAL ERROR:`, error);
      return [];
    }
  }
}

export function createStorageService(supabaseUrl: string, serviceRoleKey: string, requestId: string): SupabaseStorageService {
  return new SupabaseStorageService(supabaseUrl, serviceRoleKey, requestId);
}

export default SupabaseStorageService;
