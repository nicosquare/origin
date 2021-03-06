import React from 'react';
import { ICertificateViewItem } from '../../features/certificates';
import {
    FormControlLabel,
    Checkbox,
    List,
    ListItemIcon,
    ListItemAvatar,
    Grid,
    Avatar,
    ListItem,
    Box,
    useTheme
} from '@material-ui/core';
import { getProducingDevices, getEnvironment, useTranslation } from '../..';
import { useSelector } from 'react-redux';
import { deviceById, energyImageByType, moment, EnergyFormatter, EnergyTypes } from '../../utils';

interface IOwnProps {
    certificates: ICertificateViewItem[];
    selected: ICertificateViewItem[];
    setSelected: (certs: ICertificateViewItem[]) => void;
}

export const CertificateGroup = (props: IOwnProps) => {
    const { certificates, selected, setSelected } = props;
    const devices = useSelector(getProducingDevices);
    const environment = useSelector(getEnvironment);
    const { facilityName, gpsLatitude, gpsLongitude, gridOperator, province } = deviceById(
        certificates[0]?.deviceId,
        environment,
        devices
    );
    const {
        typography: { fontSizeMd, fontSizeSm },
        spacing
    } = useTheme();
    const { t } = useTranslation();

    const isAllSelected = () => certificates.every((cert) => selected.includes(cert));

    const toggleSelectAll = () => {
        const allUnselected = selected.filter((c) => !certificates.includes(c));
        if (isAllSelected()) {
            setSelected(allUnselected);
        } else {
            setSelected(allUnselected.concat(certificates));
        }
    };

    const isSelected = (cert: ICertificateViewItem) => {
        return selected.map((s) => s.id).includes(cert.id);
    };

    const toggleSelect = (cert: ICertificateViewItem) => {
        const pos = selected.findIndex((c) => c.id === cert.id);
        const newSelected = [...selected];
        if (pos === -1) {
            newSelected.push(cert);
        } else {
            newSelected.splice(pos, 1);
        }
        setSelected(newSelected);
    };

    return (
        <Box className="CertificateGroup" boxShadow={2}>
            <Grid
                className="Header"
                container
                style={{
                    fontSize: fontSizeMd
                }}
                alignItems="center"
            >
                <Grid item xs={7}>
                    <FormControlLabel
                        style={{ marginBottom: 0, marginLeft: 0 }}
                        control={
                            <Checkbox
                                color="primary"
                                checked={isAllSelected()}
                                onClick={toggleSelectAll}
                            />
                        }
                        label={
                            <Box mb={0} fontSize={fontSizeMd} fontWeight="fontWeightBold">
                                {province}, {facilityName}
                            </Box>
                        }
                    />
                </Grid>
                <Grid item xs={5}>
                    {gridOperator} ({gpsLongitude}, {gpsLatitude})
                </Grid>
            </Grid>
            <List style={{ padding: 0 }}>
                {certificates.map((cert) => {
                    const {
                        creationTime,
                        energy: { privateVolume, publicVolume }
                    } = cert;
                    const device = deviceById(cert.deviceId, environment, devices);
                    const type = device.deviceType.split(';')[0].toLowerCase() as EnergyTypes;
                    const energy = publicVolume.add(privateVolume);
                    return (
                        <ListItem
                            button
                            key={cert.id}
                            onClick={() => toggleSelect(cert)}
                            style={{
                                textTransform: 'capitalize',
                                paddingLeft: 0,
                                paddingRight: 0
                            }}
                            className={isSelected(cert) ? 'SelectedCertificate' : ''}
                            divider
                        >
                            <Grid container>
                                <Grid item xs={7} container style={{ justifyItems: 'flex-start' }}>
                                    <Grid item style={{ marginRight: spacing(2) }}>
                                        <ListItemIcon>
                                            <Checkbox color="primary" checked={isSelected(cert)} />
                                        </ListItemIcon>
                                    </Grid>

                                    <Grid item style={{ marginRight: spacing(2) }}>
                                        <ListItemAvatar>
                                            <Avatar
                                                src={energyImageByType(type, isSelected(cert))}
                                            ></Avatar>
                                        </ListItemAvatar>
                                    </Grid>

                                    <Grid item>
                                        <Box fontSize={fontSizeMd}>{type}</Box>
                                        <Box fontSize={fontSizeMd} fontWeight="fontWeightBold">
                                            {EnergyFormatter.format(energy, true)}
                                        </Box>
                                    </Grid>
                                </Grid>
                                <Grid item xs={5}>
                                    <Box fontSize={fontSizeSm} color="text.secondary">
                                        {t('certificate.properties.certificationDate')}
                                    </Box>
                                    <Box fontSize={fontSizeMd}>
                                        {moment.unix(creationTime).format('MMM, YYYY')}
                                    </Box>
                                </Grid>
                            </Grid>
                        </ListItem>
                    );
                })}
            </List>
        </Box>
    );
};
