# Changelog

All notable changes to this project will be documented in this file. 🤘

## [v2.1.2](https://github.com/joticajulian/koinos-contracts-as/releases/tag/v2.1.2) (2024-03-17)

fix release error

## [v2.1.1](https://github.com/joticajulian/koinos-contracts-as/releases/tag/v2.1.1) (2024-03-16)

minor fix

## [v2.1.0](https://github.com/joticajulian/koinos-contracts-as/releases/tag/v2.1.0) (2024-03-16)

### 🚀 Features

- NFT v2.1.0:
  - update ID of memo field from 100 to 4.
  - change enum direction to bool descending for paginated lists
  - new `description` field in the `get_info` function
- Nicknames v3.1.0:
  - update ID of memo field from 100 to 4.
  - change enum direction to bool descending for paginated lists
  - new `description` field in the `get_info` function
- Token v1.1.0:
  - update ID of memo field from 100 to 4.
  - change enum direction to bool descending for paginated lists
  - new `description` field in the `get_info` function
- Vapor 2.0.0:
  - Vapor token has been migrated from fogata to koinosbox/contracts
  - Tokenomics update: Lineal conversion from koin to vapor. Possibility to claim koin.
- Manasharer v2.0.3:
  - Recalculation of checksum
- Libs updated

## [v2.0.2](https://github.com/joticajulian/koinos-contracts-as/releases/tag/v2.0.2) (2024-02-24)

Bump version, update libraries

## [v2.0.1](https://github.com/joticajulian/koinos-contracts-as/releases/tag/v2.0.1) (2024-02-20)

Bump version, recalculation of checksums

## [v2.0.0](https://github.com/joticajulian/koinos-contracts-as/releases/tag/v2.0.0) (2024-02-19)

### 🚀 Features

- All contracts have been upgraded from AssemblyScript 0.19 to AssemblyScript 0.27
- All contracts upgraded to use the new getContractMetadata system call. With this upgrade we reintroduce again the call to the authorize function of smart wallet (which was removed in the previous token contract due to security reasons). For more info read: [https://peakd.com/koinos/@jga/gov-proposal-get-contract-metadata](Gov proposal get contract metadata).
- New function: `System2.isSignedBy`. To check if a transaction is signed by a particular address.
- Now Tokens, NFT, and Nicknames support memos in transfers.
- getcontractmetadata.wasm available for e2e tests.

### 🐛 Bug Fixes

- Free mana sharer: Error message fixed

## [v1.2.4](https://github.com/joticajulian/koinos-contracts-as/releases/tag/v1.2.4) (2024-01-02)

### 🚀 Features

- NFT contract: Now it has a collection owner and can be updated using the transfer_ownership function. This owner can update the metadata, royalties or mint more NFTs.

## [v1.2.3](https://github.com/joticajulian/koinos-contracts-as/releases/tag/v1.2.3) (2023-12-20)

### 🚀 Features

- Update the protobuffer "common.address": Now it uses the field value instead of account. This is to align the owner_of function for NFTs with other NFTs implementations.
- Update network and configurations
- Nicknames: temp set_metadata function with extended authority
- Improvements in the script for check contract uploads

## [v1.2.2](https://github.com/joticajulian/koinos-contracts-as/releases/tag/v1.2.1) (2023-10-29)

### 🚀 Features

- Nicknames v2.1.0:
  - Each account now can configure a main token
  - Update e2e tests
  - Names in dispute removed
  - Reservation for KAP names removed
- Tests for Get Contract Metadata System Call
- Improvements in the scripts folder: More options to deploy contracts

## [v1.2.1](https://github.com/joticajulian/koinos-contracts-as/releases/tag/v1.2.1) (2023-10-19)

### 🐛 Bug Fixes

- Fix some inconsitencies in the release

## [v1.2.0](https://github.com/joticajulian/koinos-contracts-as/releases/tag/v1.2.0) (2023-10-18)

### 🚀 Features

- Nicknames v2.0.0: Complete refactor of the logic to detect similar names. Now it saves unique patterns instead of using the levenshtein distance. The previous version was not working correctly because it was not comparing the new candidates with the correct names, ordering them alphabetically is not enough. The patterns approach solves this problem.
- Some useful scripts for nicknames
- Configure API in nicknames
- Script to inspect contract uploads

## [v1.1.2](https://github.com/joticajulian/koinos-contracts-as/releases/tag/v1.1.2) (2023-10-03)

### 🚀 Features

- Nicknames: script to mint in harbinger

### 🐛 Bug Fixes

- Nicknames v1.1.1:
  - Fix burn function (remove token from all lists)
  - Fix events in ABI

## [v1.1.1](https://github.com/joticajulian/koinos-contracts-as/releases/tag/v1.1.1) (2023-10-02)

### 🚀 Features

- Nicknames v1.1.0: Function to burn tokens

### 🐛 Bug Fixes

- NFT contract v1.0.4: Fix burn function compilation

## [v1.1.0](https://github.com/joticajulian/koinos-contracts-as/releases/tag/v1.1.0) (2023-09-30)

### 🚀 Features

- Nicknames contract v1.0.0

## [v1.0.19](https://github.com/joticajulian/koinos-contracts-as/releases/tag/v1.0.19) (2023-09-29)

### 🐛 Bug Fixes

- NFT contract v1.0.3
  - emit event for set metadata
  - during a transfer remove token approval in case owner approved for all
  - empty uri by default

## [v1.0.18](https://github.com/joticajulian/koinos-contracts-as/releases/tag/v1.0.18) (2023-09-23)

No changes. But new contract hashes

## [v1.0.17](https://github.com/joticajulian/koinos-contracts-as/releases/tag/v1.0.17) (2023-09-23)

### 🚀 Features

- Script to submit proposals
- check authority: Deployment of test contracts
- New commands for compiling, testing, and deploying code
- Introduction of HDKoinos to simplify deployments
- Create snapshots
- Hello contract removed

### 🐛 Bug Fixes

- NFT contract v1.0.2
  - Fix get_tokens_by_owner

## [v1.0.16](https://github.com/joticajulian/koinos-contracts-as/releases/tag/v1.0.16) (2023-09-13)

### 🐛 Bug Fixes

- Removing patch-package dependency in favor of @koinosbox/sdk-as
- The update in the SDK required minor updates in some contracts:
  - Burnkoinhelper contract v1.0.1
  - Check authority contract v1.0.1
  - NFT contract v1.0.1
  - Token contract v0.1.2

## [v1.0.15](https://github.com/joticajulian/koinos-contracts-as/releases/tag/v1.0.15) (2023-09-12)

### 🚀 Features

- Check authority contract v1.0.0

## [v1.0.14](https://github.com/joticajulian/koinos-contracts-as/releases/tag/v1.0.14) (2023-08-18)

### 🐛 Bug Fixes

- Fix compilation for the new precompiler

## [v1.0.13](https://github.com/joticajulian/koinos-contracts-as/releases/tag/v1.0.13) (2023-08-17)

### 🚀 Features

- NFT Contract v1.0.0
- New features from koinos-precompiler-as library

## [v1.0.12](https://github.com/joticajulian/koinos-contracts-as/releases/tag/v1.0.12) (2023-08-14)

### 🚀 Features

- Token Contract v0.1.1: minor refactor in check_authority function

## [v1.0.11](https://github.com/joticajulian/koinos-contracts-as/releases/tag/v1.0.11) (2023-08-12)

### 🚀 Features

- Token Contract v0.1.0
- Burnkoin Helper Contract v1.0.0
- Free Mana Sharer Contract v1.0.0
- Mana Sharer Contract v1.0.0
- Text Parser Library v0.1.0
