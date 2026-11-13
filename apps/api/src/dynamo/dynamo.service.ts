import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
  UpdateCommand,
  PutCommandInput,
  GetCommandInput,
  QueryCommandInput,
  DeleteCommandInput,
  UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';

@Injectable()
export class DynamoService implements OnModuleInit {
  private docClient: DynamoDBDocumentClient;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const client = new DynamoDBClient({
      region: this.config.get<string>('aws.region'),
      ...(this.config.get<string>('aws.dynamodb.endpoint') && {
        endpoint: this.config.get<string>('aws.dynamodb.endpoint'),
      }),
    });

    this.docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }

  async put(params: PutCommandInput) {
    return this.docClient.send(new PutCommand(params));
  }

  async get(params: GetCommandInput) {
    return this.docClient.send(new GetCommand(params));
  }

  async query(params: QueryCommandInput) {
    return this.docClient.send(new QueryCommand(params));
  }

  async delete(params: DeleteCommandInput) {
    return this.docClient.send(new DeleteCommand(params));
  }

  async update(params: UpdateCommandInput) {
    return this.docClient.send(new UpdateCommand(params));
  }
}
