export const envConfig = () => ({
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    dynamodb: {
      endpoint: process.env.DYNAMODB_ENDPOINT || undefined,
      itemsTable: process.env.DYNAMODB_ITEMS_TABLE || 'MyDriverItems',
      sharesTable: process.env.DYNAMODB_SHARES_TABLE || 'MyDriverShares',
    },
    s3: {
      endpoint: process.env.S3_ENDPOINT || undefined,
      bucket: process.env.S3_BUCKET || 'my-driver-files',
      presignedUrlExpiry: parseInt(process.env.S3_PRESIGNED_URL_EXPIRY || '3600', 10),
    },
  },
  cors: {
    origins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4200'],
  },
});
