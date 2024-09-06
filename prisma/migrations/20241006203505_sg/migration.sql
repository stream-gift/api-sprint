-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('SOL');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "StreamerWithdrawalStatus" AS ENUM ('PENDING', 'SENT', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "googleData" JSONB DEFAULT '{}',
    "googleImage" TEXT DEFAULT '',
    "twitchData" JSONB DEFAULT '{}',
    "twitchImage" TEXT DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Streamer" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "profileImage" TEXT,
    "profileBanner" TEXT,
    "profileColor" TEXT,

    CONSTRAINT "Streamer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamerToken" (
    "streamerId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StreamerToken_pkey" PRIMARY KEY ("streamerId")
);

-- CreateTable
CREATE TABLE "StreamerSettings" (
    "streamerId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "playNotificationSound" BOOLEAN NOT NULL DEFAULT true,
    "animationType" TEXT NOT NULL DEFAULT 'default',
    "animationParams" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "StreamerSettings_pkey" PRIMARY KEY ("streamerId")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "amountFloat" DOUBLE PRECISION NOT NULL,
    "amountAtomic" INTEGER NOT NULL,
    "amountUsd" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "message" TEXT,
    "name" TEXT,
    "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pendingUntil" TIMESTAMP(3) NOT NULL,
    "streamerId" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "transactionHash" TEXT,
    "transactionSender" TEXT,
    "transactionSenderDomainName" TEXT,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "index" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamerAddress" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "streamerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreamerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamerBalance" (
    "id" TEXT NOT NULL,
    "streamerId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pending" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StreamerBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamerWithdrawal" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "amountAtomic" INTEGER NOT NULL,
    "amountFloat" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "status" "StreamerWithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "streamerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "transactionHash" TEXT,

    CONSTRAINT "StreamerWithdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Streamer_username_key" ON "Streamer"("username");

-- CreateIndex
CREATE UNIQUE INDEX "StreamerToken_streamerId_key" ON "StreamerToken"("streamerId");

-- CreateIndex
CREATE UNIQUE INDEX "StreamerSettings_streamerId_key" ON "StreamerSettings"("streamerId");

-- CreateIndex
CREATE UNIQUE INDEX "Address_address_key" ON "Address"("address");

-- CreateIndex
CREATE UNIQUE INDEX "StreamerBalance_streamerId_currency_key" ON "StreamerBalance"("streamerId", "currency");

-- AddForeignKey
ALTER TABLE "StreamerToken" ADD CONSTRAINT "StreamerToken_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "Streamer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamerSettings" ADD CONSTRAINT "StreamerSettings_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "Streamer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "Streamer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamerAddress" ADD CONSTRAINT "StreamerAddress_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "Streamer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamerBalance" ADD CONSTRAINT "StreamerBalance_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "Streamer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamerWithdrawal" ADD CONSTRAINT "StreamerWithdrawal_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "Streamer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
