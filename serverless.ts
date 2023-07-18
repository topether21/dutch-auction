import type { AWS } from "@serverless/typescript";

import { auctionsByInscriptionId } from "@functions/auctions-by-inscription-id";
import { auctionsByCollection } from "@functions/auctions-by-collection";
import { auction } from "@functions/auction";
import { getAuctionsByAddress } from "@functions/auctions-by-address";
import { auctions } from "@functions/auctions";
import { updateAuctionStatus } from "@functions/update-auction-status";
import { publishEvent } from "@functions/publish";
import { finishAuction } from "@functions/finish-auction";
import { version } from "@functions/version";

type AWSConfig = AWS & {
  stepFunctions?: object;
};

const serverlessConfiguration: AWSConfig = {
  configValidationMode: "warn",
  plugins: [
    "serverless-step-functions",
    "serverless-esbuild",
    "serverless-ssm-fetch",
    "serverless-offline",
  ],
  service: "dutch-auction",
  frameworkVersion: "3",
  provider: {
    name: "aws",
    runtime: "nodejs18.x",
    stage: "${opt:stage, 'dev'}",
    region: "us-east-1",
    environment: {
      STAGE: "${self:provider.stage}",
      AWS_ACCOUNT_ID: {
        Ref: "AWS::AccountId",
      },
      NOSTR_PUBLIC_KEY:
        "be82246ca8d64881cc53407a773e33f9e220dc2153c52bb713a9ab1fe6a18d80",
      HASURA_ENDPOINT: "https://guiding-elf-27.hasura.app/v1/graphql",
    },
    iam: {
      role: {
        statements: [
          {
            Effect: "Allow",
            Action: ["states:StartExecution"],
            Resource: {
              "Fn::Sub":
                "arn:aws:states:${self:provider.region}:${AWS::AccountId}:stateMachine:DutchAuctionStateMachine-${self:provider.stage}",
            },
          },
          {
            Effect: "Allow",
            Action: ["lambda:InvokeFunction"],
            Resource: [
              {
                "Fn::Sub":
                  "arn:aws:lambda:${self:provider.region}:${AWS::AccountId}:function:${self:service}-${self:provider.stage}-finishAuction",
              },
              {
                "Fn::Sub":
                  "arn:aws:lambda:${self:provider.region}:${AWS::AccountId}:function:${self:service}-${self:provider.stage}-getAuctionsByAddress",
              },
              {
                "Fn::Sub":
                  "arn:aws:lambda:${self:provider.region}:${AWS::AccountId}:function:${self:service}-${self:provider.stage}-auctionsByInscriptionId",
              },
              {
                "Fn::Sub":
                  "arn:aws:lambda:${self:provider.region}:${AWS::AccountId}:function:${self:service}-${self:provider.stage}-auctionsByCollection",
              },
              {
                "Fn::Sub":
                  "arn:aws:lambda:${self:provider.region}:${AWS::AccountId}:function:${self:service}-${self:provider.stage}-auctions",
              },
              {
                "Fn::Sub":
                  "arn:aws:lambda:${self:provider.region}:${AWS::AccountId}:function:${self:service}-${self:provider.stage}-version",
              },
              {
                "Fn::Sub":
                  "arn:aws:lambda:${self:provider.region}:${AWS::AccountId}:function:${self:service}-${self:provider.stage}-auction",
              },
              {
                "Fn::Sub":
                  "arn:aws:lambda:${self:provider.region}:${AWS::AccountId}:function:${self:service}-${self:provider.stage}-updateAuctionStatus",
              },
              {
                "Fn::Sub":
                  "arn:aws:lambda:${self:provider.region}:${AWS::AccountId}:function:${self:service}-${self:provider.stage}-publishEvent",
              },
            ],
          },
          {
            Effect: "Allow",
            Action: [
              "logs:CreateLogGroup",
              "logs:CreateLogStream",
              "logs:PutLogEvents",
            ],
            Resource: {
              "Fn::Sub":
                "arn:aws:logs:${self:provider.region}:${AWS::AccountId}:log-group:/aws/lambda/${self:service}-${self:provider.stage}-auction:*",
            },
          },
          {
            Effect: "Allow",
            Action: ["ssm:Describe*", "ssm:Get*", "ssm:List*"],
            Resource: [
              {
                "Fn::Sub":
                  "arn:aws:ssm:${self:provider.region}:${AWS::AccountId}:parameter/NOSTR_PRIVATE_KEY",
              },
              {
                "Fn::Sub":
                  "arn:aws:ssm:${self:provider.region}:${AWS::AccountId}:parameter/HASURA_ADMIN_SECRET",
              },
            ],
          },
        ],
      },
    },
  },
  functions: {
    version,
    auction,
    getAuctionsByAddress,
    auctions,
    updateAuctionStatus,
    publishEvent,
    finishAuction,
    auctionsByInscriptionId,
    auctionsByCollection,
  },
  stepFunctions: {
    stateMachines: {
      DutchAuctionStateMachine: {
        name: "DutchAuctionStateMachine-${self:provider.stage}",
        definition: {
          Comment:
            "A step function machine to manage the Dutch Auction process.",
          StartAt: "InitializeAuction",
          States: {
            InitializeAuction: {
              Type: "Pass",
              ResultPath: "$",
              Next: "WaitToStart",
            },
            WaitToStart: {
              Type: "Wait",
              TimestampPath: "$.scheduledISODate", // 'scheduledISODate' should be ISO8601 format
              Next: "updateAuctionStatus",
            },
            updateAuctionStatus: {
              Type: "Task",
              Resource: {
                "Fn::GetAtt": ["UpdateAuctionStatusLambdaFunction", "Arn"],
              },
              ResultPath: "$",
              Next: "IsAuctionFinished",
            },
            IsAuctionFinished: {
              Type: "Choice",
              Choices: [
                {
                  Variable: "$.currentPrice",
                  NumericLessThanEqualsPath: "$.reservePrice",
                  Next: "AuctionFinished",
                },
                {
                  Variable: "$.auctionFinished",
                  BooleanEquals: true,
                  Next: "AuctionFinished",
                },
              ],
              Default: "WaitRoundDuration",
            },
            WaitRoundDuration: {
              Type: "Wait",
              SecondsPath: "$.secondsBetweenEachDecrease",
              Next: "updateAuctionStatus",
            },
            AuctionFinished: {
              Type: "Task",
              Resource: {
                "Fn::GetAtt": ["FinishAuctionLambdaFunction", "Arn"],
              },
              End: true,
            },
          },
        },
      },
    },
  },
  resources: {
    Resources: {},
  },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ["aws-sdk", "@aws-sdk"],
      target: "node18",
      define: { "require.resolve": undefined },
      platform: "node",
      concurrency: 10,
    },
    serverlessSsmFetch: {
      NOSTR_PRIVATE_KEY: "NOSTR_PRIVATE_KEY~true",
      HASURA_ADMIN_SECRET: "HASURA_ADMIN_SECRET~true",
    },
    customHeaders: [
      "Content-Type",
      "X-Amz-Date",
      "Authorization",
      "X-Api-Key",
      "X-Amz-Security-Token",
      "X-Amz-User-Agent",
    ],
    cors: {
      origins: ["*"], // Update with specific allowed origins
      headers: ["Content-Type"],
      allowCredentials: false,
    },
  },
};

module.exports = serverlessConfiguration;
