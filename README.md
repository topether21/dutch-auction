## Deploy

```
serverless deploy --verbose
```

### Create an auction

```
curl -X POST -H "Content-Type: application/json" -d '{"startPrice": 1, "minPrice": 0.2, "decreaseAmount": 0.05, "roundDuration": 60}' https://d874tdggqd.execute-api.us-east-1.amazonaws.com/dev/createAuction
```

### Get an auction

```
curl -X POST -H "Content-Type: application/json" -d '{"auctionId": "2e72fd91-7a07-4f41-8227-73c07cbfc6bf"}' https://d874tdggqd.execute-api.us-east-1.amazonaws.com/dev/startAuction
```
