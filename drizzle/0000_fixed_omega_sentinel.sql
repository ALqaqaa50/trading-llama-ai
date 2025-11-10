CREATE TYPE "public"."chat_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."margin_mode" AS ENUM('isolated', 'cross');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'filled', 'partially_filled', 'canceled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."order_type" AS ENUM('market', 'limit', 'stop_loss', 'take_profit');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."side" AS ENUM('buy', 'sell');--> statement-breakpoint
CREATE TYPE "public"."signal_status" AS ENUM('pending', 'executed', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."signal_type" AS ENUM('buy', 'sell', 'hold');--> statement-breakpoint
CREATE TYPE "public"."trade_status" AS ENUM('open', 'closed', 'cancelled');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "api_keys_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"exchange" varchar(32) NOT NULL,
	"apiKey" text NOT NULL,
	"secretKey" text NOT NULL,
	"passphrase" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"lastUsed" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backtest_results" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "backtest_results_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"strategyName" varchar(64) NOT NULL,
	"symbol" varchar(32) NOT NULL,
	"timeframe" varchar(16) NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp NOT NULL,
	"initialCapital" varchar(32) NOT NULL,
	"finalCapital" varchar(32) NOT NULL,
	"totalReturn" varchar(16) NOT NULL,
	"sharpeRatio" varchar(16),
	"maxDrawdown" varchar(16),
	"winRate" varchar(16),
	"totalTrades" integer NOT NULL,
	"winningTrades" integer NOT NULL,
	"losingTrades" integer NOT NULL,
	"avgWin" varchar(32),
	"avgLoss" varchar(32),
	"profitFactor" varchar(16),
	"parameters" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chat_messages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"role" "chat_role" NOT NULL,
	"content" text NOT NULL,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indicator_cache" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "indicator_cache_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"symbol" varchar(32) NOT NULL,
	"timeframe" varchar(16) NOT NULL,
	"indicatorName" varchar(64) NOT NULL,
	"timestamp" timestamp NOT NULL,
	"value" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_data" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "market_data_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"exchange" varchar(32) NOT NULL,
	"symbol" varchar(32) NOT NULL,
	"timeframe" varchar(16) NOT NULL,
	"timestamp" timestamp NOT NULL,
	"open" varchar(32) NOT NULL,
	"high" varchar(32) NOT NULL,
	"low" varchar(32) NOT NULL,
	"close" varchar(32) NOT NULL,
	"volume" varchar(32) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_executions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trade_executions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"orderId" varchar(255),
	"symbol" varchar(50) NOT NULL,
	"side" "side" NOT NULL,
	"type" "order_type" NOT NULL,
	"amount" varchar(50) NOT NULL,
	"price" varchar(50),
	"stopLoss" varchar(50),
	"takeProfit" varchar(50),
	"leverage" integer,
	"marginMode" "margin_mode",
	"status" "order_status" NOT NULL,
	"filledAmount" varchar(50),
	"averagePrice" varchar(50),
	"fee" varchar(50),
	"pnl" varchar(50),
	"pnlPercent" varchar(50),
	"strategyUsed" text,
	"aiRecommendation" text,
	"errorMessage" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"closedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trades_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"signalId" integer,
	"exchange" varchar(32) NOT NULL,
	"symbol" varchar(32) NOT NULL,
	"side" "side" NOT NULL,
	"entryPrice" varchar(32) NOT NULL,
	"exitPrice" varchar(32),
	"quantity" varchar(32) NOT NULL,
	"pnl" varchar(32),
	"pnlPercentage" varchar(16),
	"fees" varchar(32),
	"status" "trade_status" DEFAULT 'open' NOT NULL,
	"openedAt" timestamp DEFAULT now() NOT NULL,
	"closedAt" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "trading_signals" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trading_signals_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"symbol" varchar(32) NOT NULL,
	"exchange" varchar(32) NOT NULL,
	"signalType" "signal_type" NOT NULL,
	"strategy" varchar(64) NOT NULL,
	"confidence" integer NOT NULL,
	"entryPrice" varchar(32),
	"stopLoss" varchar(32),
	"takeProfit" varchar(32),
	"reasoning" text,
	"status" "signal_status" DEFAULT 'pending' NOT NULL,
	"executedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE INDEX "api_keys_userId_idx" ON "api_keys" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "backtest_results_userId_idx" ON "backtest_results" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "backtest_results_strategy_idx" ON "backtest_results" USING btree ("strategyName");--> statement-breakpoint
CREATE INDEX "chat_messages_userId_idx" ON "chat_messages" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "indicator_cache_symbol_timeframe_indicator_idx" ON "indicator_cache" USING btree ("symbol","timeframe","indicatorName","timestamp");--> statement-breakpoint
CREATE INDEX "market_data_symbol_timeframe_idx" ON "market_data" USING btree ("symbol","timeframe","timestamp");--> statement-breakpoint
CREATE INDEX "trades_userId_idx" ON "trades" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "trades_symbol_idx" ON "trades" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX "trading_signals_userId_idx" ON "trading_signals" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "trading_signals_symbol_idx" ON "trading_signals" USING btree ("symbol");