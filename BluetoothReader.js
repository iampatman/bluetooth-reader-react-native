import React, {Component} from 'react';
import {
    AppRegistry,
    StyleSheet,
    Text,
    View,
    TouchableHighlight,
    NativeAppEventEmitter,
    NativeEventEmitter,
    NativeModules,
    Platform,
    PermissionsAndroid,
    ListView,
    ScrollView,
    AppState
} from 'react-native';

import BleManager from 'react-native-ble-manager';
import TimerMixin from 'react-timer-mixin';
import reactMixin from 'react-mixin';

const window = {
    height: 667,
    width: 375
}

const deviceInfo = {
    deviceId: '1C9C427C-6039-4455-A973-405D28655412',
    serviceId: '181D',
    characteristicId: '2A9D'
}

const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

export default class BluetoothReader extends Component {
    constructor() {
        super()

        this.state = {
            scanning: false,
            peripherals: new Map(),
            appState: '',
            connected: false,
            weight: 0
        }


        this.handleDiscoverPeripheral = this.handleDiscoverPeripheral.bind(this);
        this.handleStopScan = this.handleStopScan.bind(this);
        this.handleUpdateValueForCharacteristic = this.handleUpdateValueForCharacteristic.bind(this);
        this.handleDisconnectedPeripheral = this.handleDisconnectedPeripheral.bind(this);
        this.handleAppStateChange = this.handleAppStateChange.bind(this);
    }

    componentDidMount() {
        AppState.addEventListener('change', this.handleAppStateChange);

        BleManager.start({showAlert: false});

        this.handlerDiscover = bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', this.handleDiscoverPeripheral);
        this.handlerStop = bleManagerEmitter.addListener('BleManagerStopScan', this.handleStopScan);
        this.handlerDisconnect = bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', this.handleDisconnectedPeripheral);
        this.handlerUpdate = bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', this.handleUpdateValueForCharacteristic);


        if (Platform.OS === 'android' && Platform.Version >= 23) {
            PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
                if (result) {
                    console.log("Permission is OK");
                } else {
                    PermissionsAndroid.requestPermission(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION).then((result) => {
                        if (result) {
                            console.log("User accept");
                        } else {
                            console.log("User refuse");
                        }
                    });
                }
            });
        }

    }

    handleAppStateChange(nextAppState) {
        if (this.state.appState.match(/inactive|background/) && nextAppState === 'active') {
            console.log('App has come to the foreground!')
            BleManager.getConnectedPeripherals([]).then((peripheralsArray) => {
                console.log('Connected peripherals: ' + peripheralsArray.length);
            });
        }
        this.setState({appState: nextAppState});
    }

    componentWillUnmount() {
        this.handlerDiscover.remove();
        this.handlerStop.remove();
        this.handlerDisconnect.remove();
        this.handlerUpdate.remove();
    }

    handleDisconnectedPeripheral(data) {
        let peripherals = this.state.peripherals;
        let peripheral = peripherals.get(data.peripheral);
        if (peripheral) {
            peripheral.connected = false;
            peripherals.set(peripheral.id, peripheral);
            this.setState({peripherals});
        }
        console.log('Disconnected from ' + data.peripheral);
    }

    handleUpdateValueForCharacteristic(data) {
        console.log('Received data from ' + data.peripheral + ' characteristic ' + data.characteristic, data.value);
        this.setState({
            weight: data.value
        })
    }

    handleStopScan() {
        console.log('Scan is stopped');
        this.setState({scanning: false});
    }

    startScan() {
        if (!this.state.scanning) {
            BleManager.scan([], 3, true).then((results) => {
                console.log('Scanning...');
                this.setState({scanning: true});
            });
        }
    }

    startNotification(peripheralId, serviceId, charId) {
        BleManager.startNotification(peripheralId, serviceId, charId)
            .then(() => {
                // Success code
                console.log('Notification started');
            })
            .catch((error) => {
                // Failure code
                console.log(error);
            });
    }

    retrieveServices(peripheral) {
        BleManager.retrieveServices(peripheral.id)
            .then((peripheralInfo) => {
                console.log('Peripheral info:', peripheralInfo);
                this.startNotification(peripheral.id, deviceInfo.serviceId, deviceInfo.characteristicId)
            });
    }

    connectToPeripheral(peripheral) {
        console.log('connectToPeripheral: ' + peripheral.id)
        BleManager.connect(peripheral.id)
            .then(() => {
                console.log('Connected');
                this.setState({
                    connected: true
                })
                this.retrieveServices(peripheral)
            })
            .catch((error) => {
                // Failure code
                console.log(error);
            });
    }


    connectToItem(item) {
        this.connectToPeripheral(item)
    }


    handleDiscoverPeripheral(peripheral) {
        var peripherals = this.state.peripherals;
        if (peripheral.id == deviceInfo.deviceId) {
            console.log('Got ble peripheral', peripheral);
            peripherals.set(peripheral.id, peripheral);
            this.setState({peripherals})
            this.connectToItem(peripheral)
        }


        // if (!peripherals.has(peripheral.id)) {
        //     console.log('Got ble peripheral', peripheral);
        //     peripherals.set(peripheral.id, peripheral);
        //     this.setState({peripherals})
        // }
    }

    test(peripheral) {
        if (peripheral) {
            if (peripheral.connected) {
                BleManager.disconnect(peripheral.id);
            } else {
                BleManager.connect(peripheral.id).then(() => {
                    let peripherals = this.state.peripherals;
                    let p = peripherals.get(peripheral.id);
                    if (p) {
                        p.connected = true;
                        peripherals.set(peripheral.id, p);
                        this.setState({peripherals});
                    }
                    console.log('Connected to ' + peripheral.id);


                    this.setTimeout(() => {

                        /* Test read current RSSI value
                        BleManager.retrieveServices(peripheral.id).then((peripheralData) => {
                          console.log('Retrieved peripheral services', peripheralData);

                          BleManager.readRSSI(peripheral.id).then((rssi) => {
                            console.log('Retrieved actual RSSI value', rssi);
                          });
                        });*/

                        // Test using bleno's pizza example
                        // https://github.com/sandeepmistry/bleno/tree/master/examples/pizza
                        BleManager.retrieveServices(peripheral.id).then((peripheralInfo) => {
                            console.log(peripheralInfo);
                            var service = '13333333-3333-3333-3333-333333333337';
                            var bakeCharacteristic = '13333333-3333-3333-3333-333333330003';
                            var crustCharacteristic = '13333333-3333-3333-3333-333333330001';

                            this.setTimeout(() => {
                                BleManager.startNotification(peripheral.id, service, bakeCharacteristic).then(() => {
                                    console.log('Started notification on ' + peripheral.id);
                                    this.setTimeout(() => {
                                        BleManager.write(peripheral.id, service, crustCharacteristic, [0]).then(() => {
                                            console.log('Writed NORMAL crust');
                                            BleManager.write(peripheral.id, service, bakeCharacteristic, [1, 95]).then(() => {
                                                console.log('Writed 351 temperature, the pizza should be BAKED');
                                                /*
                                                var PizzaBakeResult = {
                                                  HALF_BAKED: 0,
                                                  BAKED:      1,
                                                  CRISPY:     2,
                                                  BURNT:      3,
                                                  ON_FIRE:    4
                                                };*/
                                            });
                                        });

                                    }, 500);
                                }).catch((error) => {
                                    console.log('Notification error', error);
                                });
                            }, 200);
                        });

                    }, 900);
                }).catch((error) => {
                    console.log('Connection error', error);
                });
            }
        }
    }

    render() {
        const list = Array.from(this.state.peripherals.values());
        const dataSource = ds.cloneWithRows(list);


        return (
            <View style={styles.container}>
                <TouchableHighlight style={{marginTop: 40, margin: 20, padding: 20, backgroundColor: '#ccc'}}
                                    onPress={() => this.startScan()}>
                    <Text>Scan Bluetooth ({this.state.scanning ? 'on' : 'off'})</Text>
                </TouchableHighlight>

                <Text>Device status: {this.state.connected ? 'Connected' : 'Not Connected'}</Text>
                <Text>Measurements: {this.state.weight} kg</Text>
                <ScrollView style={styles.scroll}>
                    {(list.length == 0) &&
                    <View style={{flex: 1, margin: 20}}>
                        <Text style={{textAlign: 'center'}}>No peripherals</Text>
                    </View>
                    }
                    <ListView
                        enableEmptySections={true}
                        dataSource={dataSource}
                        renderRow={(item) => {
                            const color = item.connected ? 'green' : '#fff';
                            return (
                                <TouchableHighlight onPress={() => this.connectToItem(item)}>
                                    <View style={[styles.row, {backgroundColor: color}]}>
                                        <Text style={{
                                            fontSize: 12,
                                            textAlign: 'center',
                                            color: '#333333',
                                            padding: 10
                                        }}>{item.name}</Text>
                                        <Text style={{
                                            fontSize: 8,
                                            textAlign: 'center',
                                            color: '#333333',
                                            padding: 10
                                        }}>{item.id}</Text>
                                    </View>
                                </TouchableHighlight>
                            );
                        }}
                    />
                </ScrollView>
            </View>
        );
    }
}
reactMixin(BluetoothReader.prototype, TimerMixin);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
        width: window.width,
        height: window.height
    },
    scroll: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        margin: 10,
    },
    row: {
        margin: 10
    },
});
