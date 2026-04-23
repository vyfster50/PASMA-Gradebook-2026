<?php
// This file is part of Moodle - http://moodle.org/

defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {
    $settings = new admin_settingpage('local_gradebookapi', get_string('pluginname', 'local_gradebookapi'));

    $settings->add(new admin_setting_configtext(
        'local_gradebookapi/apitoken',
        get_string('apitoken', 'local_gradebookapi'),
        get_string('apitoken_desc', 'local_gradebookapi'),
        '',
        PARAM_TEXT
    ));

    $ADMIN->add('localplugins', $settings);
}
