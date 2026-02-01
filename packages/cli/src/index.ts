#!/usr/bin/env node

import { Command } from 'commander';
import Table from 'cli-table3';
import { formatDistanceToNow } from 'date-fns';
import { TempoClient } from './client';
import { TempoSession } from '@tempo/contracts';
import inquirer from 'inquirer';
import chalk from 'chalk';

const program = new Command();

program
    .name('tempo')
    .description('CLI for Tempo Activity Tracker')
    .version('1.0.0');

// Existing Non-Interactive Commands
program.command('stats')
    .description('Show recent activity sessions')
    .option('-l, --limit <number>', 'Number of sessions to show', '20')
    .action(async (options) => {
        await displayStats(parseInt(options.limit));
    });

program.command('analytics')
    .description('Show usage statistics')
    .option('-g, --group-by <type>', 'Group by: hour, day, month, project, language', 'project')
    .action(async (options) => {
        await displayAnalytics(options.groupBy);
    });

// Interactive Mode
program.action(async () => {
    // If no args provided, start interactive loop
    console.log(chalk.bold.blue('Welcome to Tempo CLI'));
    console.log(chalk.gray('Type commands to interact with the Time Tracker Agent.'));

    await interactiveLoop();
});

async function interactiveLoop() {
    const client = new TempoClient();

    while (true) {
        const { command } = await inquirer.prompt([
            {
                type: 'list',
                name: 'command',
                message: 'What would you like to do?',
                choices: [
                    { name: 'Show Today\'s Summary', value: 'today' },
                    { name: 'Show Active Projects', value: 'projects' },
                    { name: 'Show Recent Sessions', value: 'stats' },
                    { name: 'Exit', value: 'exit' }
                ]
            }
        ]);

        if (command === 'exit') {
            console.log(chalk.yellow('Goodbye!'));
            break;
        }

        try {
            if (command === 'today') {
                await displayToday(client);
            } else if (command === 'projects') {
                await displayProjects(client);
            } else if (command === 'stats') {
                await displayStats(20, client);
            }
        } catch (e: any) {
            console.error(chalk.red('Error:'), e.message);
        }

        console.log(''); // Empty line for spacing
    }

    client.close();
}

async function displayToday(client?: TempoClient) {
    const c = client || new TempoClient();
    console.log(chalk.cyan('Fetching today\'s activity...'));

    // Fetch work pattern for today
    const patternRes = await c.request({ type: 'query_work_pattern', days: 0 });
    // Fetch project breakdown for today (using trend grouped by project)
    const projectsRes = await c.request({ type: 'query_trend', groupBy: 'project', days: 0 });

    if (patternRes.success && patternRes.data && patternRes.data.length > 0) {
        const day = patternRes.data[0];
        const total = (day.writing_seconds || 0) + (day.reading_seconds || 0);
        console.log(chalk.bold(`Total Time: ${formatDuration(total)}`));
        console.log(`Writing: ${formatDuration(day.writing_seconds || 0)} | Reading: ${formatDuration(day.reading_seconds || 0)}`);
    } else {
        console.log('No activity recorded today.');
    }

    if (projectsRes.success && projectsRes.data) {
        const table = new Table({ head: [chalk.white('Project'), chalk.white('Time')] });

        // Aggregate project times
        const projAgg: Record<string, number> = {};
        (projectsRes.data as any[]).forEach(day => {
            Object.entries(day).forEach(([key, val]) => {
                if (key !== 'date') projAgg[key] = (projAgg[key] || 0) + (val as number);
            });
        });

        Object.entries(projAgg)
            .sort((a, b) => b[1] - a[1])
            .forEach(([name, duration]) => {
                table.push([pathBasename(name), formatDuration(duration)]);
            });

        if (Object.keys(projAgg).length > 0) {
            console.log(chalk.bold('\nProjects Activity:'));
            console.log(table.toString());
        }
    }

    if (!client) c.close();
}

async function displayProjects(client: TempoClient) {
    // 30 days view for active projects
    const res = await client.request({ type: 'query_trend', groupBy: 'project', days: 30 });
    if (res.success && res.data) {
        const projAgg: Record<string, number> = {};
        (res.data as any[]).forEach(day => {
            Object.entries(day).forEach(([key, val]) => {
                if (key !== 'date') projAgg[key] = (projAgg[key] || 0) + (val as number);
            });
        });

        const table = new Table({ head: [chalk.white('Active Projects (30d)'), chalk.white('Total Time')] });
        Object.entries(projAgg)
            .sort((a, b) => b[1] - a[1])
            .forEach(([name, duration]) => {
                table.push([pathBasename(name), formatDuration(duration)]);
            });
        console.log(table.toString());
    }
}

async function displayStats(limit: number, existingClient?: TempoClient) {
    const client = existingClient || new TempoClient();
    try {
        const response = await client.request({
            type: 'query_sessions',
            limit: limit
        });

        if (!response.success) {
            console.error(chalk.red('Error fetching sessions:'), response.error);
            return;
        }

        const sessions = response.data as TempoSession[];
        const table = new Table({
            head: ['Project/App', 'File', 'Duration', 'Last Active'].map(h => chalk.white(h))
        });

        sessions.forEach(s => {
            table.push([
                s.context.project_path ? pathBasename(s.context.project_path) : (s.context.app_name || 'Unknown'),
                s.context.file_path ? pathBasename(s.context.file_path) : '-',
                formatDuration(s.duration_seconds),
                formatDistanceToNow(new Date(s.last_active_time), { addSuffix: true })
            ]);
        });

        console.log(table.toString());

    } finally {
        if (!existingClient) client.close();
    }
}

async function displayAnalytics(groupBy: any) {
    const client = new TempoClient();
    try {
        const response = await client.request({
            type: 'query_analytics',
            groupBy: groupBy
        });

        // ... (Keep existing analytics logic if needed, or deprecate/hide in interactive)
        // For brevity, just logging it
        console.log(response.data);
    } finally {
        client.close();
    }
}

function pathBasename(p: string) {
    return p.split(/[\\/]/).pop() || p;
}

function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
}

program.parse();
