/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { IChannel } from 'vs/base/parts/ipc/node/ipc';
import { Event, Emitter } from 'vs/base/common/event';
import { timeout } from 'vs/base/common/async';

export interface IMarcoPoloEvent {
	answer: string;
}

export interface ITestService {
	onMarco: Event<IMarcoPoloEvent>;
	marco(): Thenable<string>;
	pong(ping: string): Thenable<{ incoming: string, outgoing: string }>;
	cancelMe(): Thenable<boolean>;
}

export class TestService implements ITestService {

	private _onMarco = new Emitter<IMarcoPoloEvent>();
	onMarco: Event<IMarcoPoloEvent> = this._onMarco.event;

	marco(): Thenable<string> {
		this._onMarco.fire({ answer: 'polo' });
		return Promise.resolve('polo');
	}

	pong(ping: string): Thenable<{ incoming: string, outgoing: string }> {
		return Promise.resolve({ incoming: ping, outgoing: 'pong' });
	}

	cancelMe(): Thenable<boolean> {
		return Promise.resolve(timeout(100)).then(() => true);
	}
}

export interface ITestChannel extends IChannel {
	listen<IMarcoPoloEvent>(event: 'marco'): Event<IMarcoPoloEvent>;
	listen<T>(event: string, arg?: any): Event<T>;

	call(command: 'marco'): Thenable<any>;
	call(command: 'pong', ping: string): Thenable<any>;
	call(command: 'cancelMe'): Thenable<any>;
	call(command: string, ...args: any[]): Thenable<any>;
}

export class TestChannel implements ITestChannel {

	constructor(private testService: ITestService) { }

	listen(event: string, arg?: any): Event<any> {
		switch (event) {
			case 'marco': return this.testService.onMarco;
		}

		throw new Error('Event not found');
	}

	call(command: string, ...args: any[]): Thenable<any> {
		switch (command) {
			case 'pong': return this.testService.pong(args[0]);
			case 'cancelMe': return this.testService.cancelMe();
			case 'marco': return this.testService.marco();
			default: return Promise.reject(new Error('command not found'));
		}
	}
}

export class TestServiceClient implements ITestService {

	get onMarco(): Event<IMarcoPoloEvent> { return this.channel.listen('marco'); }

	constructor(private channel: ITestChannel) { }

	marco(): Thenable<string> {
		return this.channel.call('marco');
	}

	pong(ping: string): Thenable<{ incoming: string, outgoing: string }> {
		return this.channel.call('pong', ping);
	}

	cancelMe(): Thenable<boolean> {
		return this.channel.call('cancelMe');
	}
}