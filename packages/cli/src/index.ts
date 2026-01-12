#!/usr/bin/env node

import { Command } from 'commander';
import Table from 'cli-table3';
import { formatDistanceToNow } from 'date-fns';
import { TempoClient } from './client';
import { TempoSession } from '@tempo/contracts';

const program = new Command();

program
    .name('tempo')
    .description('CLI for Tempo Activity Tracker')
    .version('1.0.0');

program.command('stats')
    .description('Show recent activity sessions')
    .option('-l, --limit <number>', 'Number of sessions to show', '20')
    .action(async (options) => {
        const client = new TempoClient();

        try {
            const response = await client.request({
                type: 'query_sessions',
                limit: parseInt(options.limit)
            });

            if (!response.success) {
                console.error('Error fetching sessions:', response.error);
                process.exit(1);
            }

            const sessions = response.data as TempoSession[];

            const table = new Table({
                head: ['Project/App', 'File', 'Duration', 'Last Active', 'Status']
            });

            sessions.forEach(s => {
                table.push([
                    s.context.project_path ? pathBasename(s.context.project_path) : (s.context.app_name || 'Unknown'),
                    s.context.file_path ? pathBasename(s.context.file_path) : '-',
                    formatDuration(s.duration_seconds),
                    formatDistanceToNow(new Date(s.last_active_time), { addSuffix: true }),
                    s.status
                ]);
            });

            console.log(table.toString());

        } catch (error: any) {
            console.error('Failed to connect to Tempo Agent.');
            console.error('Is the agent running? (try: pnpm dev in agent folder)');
            console.error('Error details:', error.message);
        } finally {
            client.close();
        }
    });

program.command('analytics')
    .description('Show usage statistics')
    .option('-g, --group-by <type>', 'Group by: hour, day, month, project, language', 'project')
    .action(async (options) => {
        const client = new TempoClient();
        try {
            const response = await client.request({
                type: 'query_analytics',
                groupBy: options.groupBy
            });

            if (!response.success) {
                console.error('Error fetching analytics:', response.error);
                process.exit(1);
            }

            const items = response.data as any[];

            const table = new Table({
                head: ['Key', 'Total Duration', 'Count']
            });

            items.forEach(item => {
                table.push([
                    item.key || 'Unknown',
                    formatDuration(item.total_duration_seconds),
                    item.session_count
                ]);
            });

            console.log(table.toString());

        } catch (error: any) {
            console.error('Failed to get analytics:', error.message);
        } finally {
            client.close();
        }
    });

function pathBasename(p: string) {
    return p.split(/[\\/]/).pop() || p;
}

function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
}

program.parse();
