# Changelog

All notable changes to this project will be documented in this file. 🤘

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
